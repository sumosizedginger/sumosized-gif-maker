from playwright.sync_api import sync_playwright
import time

def verify_toast():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Enable SharedArrayBuffer
        context = browser.new_context()
        page = context.new_page()

        try:
            page.goto("http://localhost:3000/index.html")
            print(f"Page title: {page.title()}")

            # Select video file
            with page.expect_file_chooser() as fc_info:
                page.click("#uploadSection .upload-btn")
            file_chooser = fc_info.value
            file_chooser.set_files("sample.mp4")

            # Wait for video to load
            page.wait_for_selector("#videoPlayer", state="visible")

            # Trigger conversion
            page.click("#convertBtn")

            # Wait for success toast
            page.wait_for_selector(".toast.show", timeout=60000)

            # Take screenshot
            page.screenshot(path="verification_success.png")
            print("Screenshot saved to verification_success.png")

        except Exception as e:
            print(f"Verification Error: {e}")
            page.screenshot(path="verification_failure.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_toast()
