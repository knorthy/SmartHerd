"""Virtual ESP32: streams top-view ToF as 'TOF,<cm>' lines at ~5 Hz over TCP.
ponytail: TCP on 127.0.0.1 stands in for the USB-serial link; swap the socket for pyserial on the real Pi.
Usage: python esp32_sim.py [port=8765] [base_cm=70]
"""
import random
import socketserver
import sys
import time

DROPOUT = 0.1  # chance a reading is lost (flaky sensor)


def tof_cm(base=70.0, sigma=1.0):
    """One noisy ToF reading in cm, or None on dropout. Also the Pi's direct side-ToF sensor."""
    return None if random.random() < DROPOUT else round(random.gauss(base, sigma), 1)


def serve(port=8765, base=70.0):
    class Link(socketserver.StreamRequestHandler):
        def handle(self):
            try:
                while True:
                    cm = tof_cm(base)
                    if cm is not None:
                        self.wfile.write(f"TOF,{cm}\n".encode())
                    time.sleep(0.2)
            except OSError:  # Pi hung up
                pass

    socketserver.ThreadingTCPServer.daemon_threads = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", port), Link) as srv:
        srv.serve_forever()


if __name__ == "__main__":
    serve(int(sys.argv[1]) if len(sys.argv) > 1 else 8765, float(sys.argv[2]) if len(sys.argv) > 2 else 70.0)
