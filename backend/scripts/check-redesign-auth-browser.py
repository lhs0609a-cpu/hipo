import asyncio
import json
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "hipo-redesign"
SESSION = Path(tempfile.gettempdir()) / "tmp" / "review-session.json"
URL = "http://127.0.0.1:8168"


async def main():
    fixture = json.loads(SESSION.read_text(encoding="utf-8"))
    errors = []
    checks = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 430, "height": 932}, device_scale_factor=1)
        await context.add_init_script(
            script=f"localStorage.setItem('token', {json.dumps(fixture['token'])}); localStorage.setItem('user', {json.dumps(json.dumps(fixture['user'], ensure_ascii=False))});"
        )
        page = await context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        await page.goto(URL, wait_until="networkidle")
        await page.get_by_text("내가 가진 PO").wait_for()

        await page.get_by_text("내가 가진 PO").click()
        await page.get_by_text("전체 PO").wait_for()
        await page.screenshot(path=OUTPUT / "06-wallet-auth.png", full_page=True)
        checks.append("authenticated wallet")

        await page.get_by_text("송금", exact=True).click()
        await page.get_by_text("PO 보내기").wait_for()
        await page.screenshot(path=OUTPUT / "07-transfer-auth.png", full_page=True)
        checks.append("authenticated transfer")

        await page.get_by_test_id("transfer-back").click()
        await page.get_by_text("전체 PO").wait_for()
        await page.get_by_test_id("wallet-back").click()
        await page.get_by_text("다음 주인공을").wait_for()
        await page.get_by_text("메뉴", exact=True).last.click()
        await page.get_by_text("내 HIPO", exact=True).wait_for()
        await page.screenshot(path=OUTPUT / "08-my-hipo-auth.png", full_page=True)
        checks.append("authenticated account hub")
        await browser.close()

    result = {"passed": not errors, "checks": checks, "pageErrors": errors}
    (OUTPUT / "auth-browser-check.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    if errors:
        raise RuntimeError("Browser errors: " + " | ".join(errors))
    print("PASS: " + ", ".join(checks))


if __name__ == "__main__":
    asyncio.run(main())
