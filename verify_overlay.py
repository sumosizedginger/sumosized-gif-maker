from playwright.sync_api import sync_playwright

def verify_app_loaded_and_text_input():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Go to the local server
        page.goto("http://localhost:3000/index.html")

        # Wait for the page to load
        page.wait_for_selector("h1")

        # Click on the Overlays tab to reveal the input
        page.click("button:has-text('Overlays')")

        # Check if the overlay text input is visible
        assert page.is_visible("#overlayText")

        # Take a screenshot
        page.screenshot(path="verification_overlay.png")

        browser.close()

if __name__ == "__main__":
    verify_app_loaded_and_text_input()