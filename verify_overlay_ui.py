from playwright.sync_api import sync_playwright

def verify_overlay_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Go to the local server
        page.goto("http://localhost:3000/index.html")

        # Wait for the page to load
        page.wait_for_selector("h1")

        # Force show the controls panel for testing purposes
        page.evaluate("document.getElementById('controlsPanel').style.display = 'block'")

        # Now click on the Overlays tab
        page.click("button:has-text('Overlays')")

        # Check if the overlay text input is visible
        assert page.is_visible("#overlayText")

        # Check if text size and position inputs are also there
        assert page.is_visible("#textSize")
        assert page.is_visible("#textPos")

        print("Overlay UI elements found successfully.")

        # Take a screenshot
        page.screenshot(path="verification_overlay_ui.png")

        browser.close()

if __name__ == "__main__":
    verify_overlay_ui()