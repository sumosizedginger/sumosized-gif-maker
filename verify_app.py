from playwright.sync_api import sync_playwright
import time

def verify_app():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Go to the local server
        page.goto("http://localhost:3000/index.html")

        # Wait for the page to load
        page.wait_for_selector("h1")

        # Check if the title is correct
        assert "Video to GIF Converter" in page.title()

        # Check if the upload button is visible
        assert page.is_visible(".upload-btn")

        # Take a screenshot
        page.screenshot(path="verification.png")

        browser.close()

if __name__ == "__main__":
    verify_app()