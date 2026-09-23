import asyncio
import json
from pathlib import Path

from playwright.async_api import async_playwright


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "hipo-redesign"
URL = "http://127.0.0.1:8168"


async def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    checks = []
    errors = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 430, "height": 932}, device_scale_factor=1)
        page.on("pageerror", lambda error: errors.append(str(error)))

        await page.goto(URL, wait_until="networkidle")
        await page.get_by_text("좋아하는 사람의").wait_for()
        await page.screenshot(path=OUTPUT / "01-welcome.png", full_page=True)
        checks.append("welcome hero and copy")

        await page.get_by_text("무료로 시작하기").click()
        await page.get_by_text("새로운 가능성을").wait_for()
        await page.screenshot(path=OUTPUT / "02-register.png", full_page=True)
        checks.append("registration form and copy")

        await page.goto(URL, wait_until="networkidle")
        await page.get_by_text("이미 계정이 있어요").click()
        await page.get_by_text("다시 만나서 반가워요").wait_for()
        await page.screenshot(path=OUTPUT / "02-login.png", full_page=True)
        checks.append("login form")

        await page.goto(URL, wait_until="networkidle")
        await page.get_by_text("좋아하는 사람의").wait_for()
        await page.get_by_text("먼저 둘러보기").click()
        await page.get_by_text("다음 주인공을").wait_for()
        await page.wait_for_timeout(16000)
        await page.screenshot(path=OUTPUT / "03-home-guest.png", full_page=True)
        checks.append("guest home")

        await page.get_by_text("발견", exact=True).last.click()
        await page.get_by_text("사람 발견").wait_for()
        await page.wait_for_timeout(16000)
        await page.screenshot(path=OUTPUT / "03-market.png", full_page=True)
        checks.append("market discovery tab")

        await page.get_by_text("피드", exact=True).last.click()
        await page.get_by_text("사람들의 지금").wait_for()
        await page.get_by_text("아직 도착한 이야기가 없어요").wait_for(timeout=20000)
        await page.screenshot(path=OUTPUT / "04-community.png", full_page=True)
        checks.append("community tab")

        await page.get_by_text("메뉴", exact=True).last.click()
        await page.get_by_text("나만의 발견을").wait_for()
        await page.screenshot(path=OUTPUT / "05-my-hipo-guest.png", full_page=True)
        checks.append("guest account tab")

        await browser.close()

    result = {"passed": not errors, "checks": checks, "pageErrors": errors}
    (OUTPUT / "browser-check.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    if errors:
        raise RuntimeError("Browser errors: " + " | ".join(errors))
    print("PASS: " + ", ".join(checks))


if __name__ == "__main__":
    asyncio.run(main())
