from playwright.sync_api import sync_playwright
import time

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # Enable SharedArrayBuffer
        context = browser.new_context()
        page = context.new_page()

        # Subscribe to console logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

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
            print("Video loaded.")

            # Click convert button (Normal)
            page.click("#convertBtn")
            print("Conversion started.")

            # Wait for final toast (success or error)
            for _ in range(60): # Wait up to 60 seconds
                toast = page.query_selector(".toast.show")
                if toast:
                    text = toast.inner_text()
                    print(f"Toast visible: {text}")
                    if "ELITE GIF GENERATED" in text:
                        print("Test Result: SUCCESS")
                        break
                    if "Processing Error" in text:
                        print("Test Result: FAILURE (Reproduced)")
                        break
                time.sleep(1)
            else:
                print("Test Result: TIMEOUT")

        except Exception as e:
            print(f"Test Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run_test()
