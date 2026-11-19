import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { createServer, type ViteDevServer } from "vite";
import { getCell } from "./coords.ts";
import { readXlsxBytes } from "./ooxml.ts";

let testServer: ViteDevServer | undefined;
let testServerUrl = "";

test.describe("Excel real Chromium browser downloads", () => {
	test.beforeAll(async () => {
		testServer = await createServer({
			root: process.cwd(),
			configFile: false,
			logLevel: "silent",
			optimizeDeps: { include: ["fflate"] },
			server: { port: 0, host: "127.0.0.1", hmr: false },
			plugins: [
				svelte(),
				{
					name: "excel-browser-test-blank-page",
					configureServer(server) {
						server.middlewares.use((req, res, next) => {
							if (req.url === "/__excel-test.html") {
								res.statusCode = 200;
								res.setHeader("Content-Type", "text/html; charset=utf-8");
								res.end("<!doctype html><html><body></body></html>");
								return;
							}
							next();
						});
					},
				},
			],
		});
		await testServer.listen();
		const resolved = testServer.resolvedUrls?.local[0];
		if (!resolved) {
			throw new Error("Failed to resolve local Vite test server URL.");
		}
		testServerUrl = `${resolved}__excel-test.html`;
	});

	test.afterAll(async () => {
		await testServer?.close();
	});

	test("downloadXlsxBytes triggers a real Chromium download with valid XLSX content and leaves zero leftover anchors", async ({
		page,
	}) => {
		await page.goto(testServerUrl);

		const [download, evalResult] = await Promise.all([
			page.waitForEvent("download"),
			page.evaluate(async () => {
				const indexUrl = "/src/modules/excel/index.ts";
				const { downloadXlsxBytes, setCell, writeXlsxBytes } = (await import(
					/* @vite-ignore */ indexUrl
				)) as typeof import("./index.ts");

				const sheet = { name: "Summary", cells: new Map() };
				setCell(sheet, "A1", { value: "Metric" });
				setCell(sheet, "B1", { value: "Value" });
				setCell(sheet, "A2", { value: "Revenue" });
				setCell(sheet, "B2", { value: 1234.5 });

				const bytes = writeXlsxBytes({ dateSystem: 1900, sheets: [sheet] });
				downloadXlsxBytes(bytes, "quarterly-report.xlsx");

				return {
					byteLength: bytes.byteLength,
					anchorCount: document.body.querySelectorAll("a").length,
				};
			}),
		]);

		expect(download.suggestedFilename()).toBe("quarterly-report.xlsx");
		expect(evalResult.anchorCount).toBe(0);
		await expect(page.locator("body a")).toHaveCount(0);

		const downloadedPath = await download.path();
		expect(downloadedPath).toBeTruthy();
		if (downloadedPath === null) {
			throw new Error("Expected download.path() to return a file path.");
		}

		const downloadedBytes = new Uint8Array(readFileSync(downloadedPath));
		expect(downloadedBytes.byteLength).toBe(evalResult.byteLength);
		// Verify ZIP local file header signature (PK\x03\x04)
		expect([...downloadedBytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);

		const parsedWorkbook = readXlsxBytes(downloadedBytes);
		expect(parsedWorkbook.sheets.map((s) => s.name)).toEqual(["Summary"]);
		const summarySheet = parsedWorkbook.sheets[0];
		if (summarySheet === undefined) {
			throw new Error("Expected Summary sheet in downloaded workbook.");
		}
		expect(getCell(summarySheet, "A2")?.value).toBe("Revenue");
		expect(getCell(summarySheet, "B2")?.value).toBe(1234.5);
	});

	test("downloadCsvText triggers a real Chromium download with expected UTF-8 content and leaves zero leftover anchors", async ({
		page,
	}) => {
		await page.goto(testServerUrl);

		const expectedCsv = "Name,Score\nAlice,42\nÜbung,99\n";

		const [download, anchorCount] = await Promise.all([
			page.waitForEvent("download"),
			page.evaluate(async (csvText) => {
				const indexUrl = "/src/modules/excel/index.ts";
				const { downloadCsvText } = (await import(
					/* @vite-ignore */ indexUrl
				)) as typeof import("./index.ts");

				downloadCsvText(csvText, "scores.csv");
				return document.body.querySelectorAll("a").length;
			}, expectedCsv),
		]);

		expect(download.suggestedFilename()).toBe("scores.csv");
		expect(anchorCount).toBe(0);
		await expect(page.locator("body a")).toHaveCount(0);

		const downloadedPath = await download.path();
		expect(downloadedPath).toBeTruthy();
		if (downloadedPath === null) {
			throw new Error("Expected download.path() to return a file path.");
		}

		const downloadedText = readFileSync(downloadedPath, "utf8");
		expect(downloadedText).toBe(expectedCsv);
	});
});
