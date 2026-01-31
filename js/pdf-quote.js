/* === PDF QUOTE GENERATOR === */
const PDFQuote = {

  // SVG logo embedded as base64 data URI — works offline and from file:// protocol
  LOGO_URI: 'data:image/svg+xml;base64,CiAgICAgICAgPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHdpZHRoPSIzMjAwIiAKICAgICAgICBoZWlnaHQ9IjE5MDIuNTY2MTM0NTg4NzU4IiB2aWV3Qm94PSIwIDAgMzIwMCAxOTAyLjU2NjEzNDU4ODc1OCI+CgkJCTxyZWN0IGZpbGw9IiMxMTExMTEiIHdpZHRoPSIzMjAwIiBoZWlnaHQ9IjE5MDIuNTY2MTM0NTg4NzU4Ii8+CgkJCTxnIHRyYW5zZm9ybT0ic2NhbGUoMTApIHRyYW5zbGF0ZSgxMCwgMTApIj4KCQkJCTxkZWZzIGlkPSJTdmdqc0RlZnMxMjg2Ij48L2RlZnM+PGcgaWQ9IlN2Z2pzRzEyODciIGZlYXR1cmVLZXk9IjhJZGtrai0wIiB0cmFuc2Zvcm09Im1hdHJpeCg0LjAxOTI5MjYzNzM2ODQ1NiwwLDAsNC4wMTkyOTI2MzczNjg0NTYsLTIuNzMzMTE4MzAzNDUzMjQxNCwtMjEuMzgyNjM5NDM3MzA1NTc0KSIgZmlsbD0iI2Y2ZjZmNiI+PHBhdGggZD0iTTguMTIgMjAuMiBjLTQuMSAwIC03LjQ0IC0zLjMyIC03LjQ0IC03LjQyIGMwIC00LjEyIDMuMzQgLTcuNDYgNy40NCAtNy40NiBjNC4xMiAwIDcuNDYgMy4zNCA3LjQ2IDcuNDYgYzAgNC4xIC0zLjM0IDcuNDIgLTcuNDYgNy40MiB6IE04LjEyIDcuOTggYy0yLjYyIDAgLTQuNzYgMi4xNCAtNC43NiA0LjggYzAgMi42NCAyLjE0IDQuNzggNC43NiA0Ljc4IHM0Ljc2IC0yLjE0IDQuNzYgLTQuNzggYzAgLTIuNjYgLTIuMTQgLTQuOCAtNC43NiAtNC44IHogTTIyLjM0MDAwMDAwMDAwMDAwMyAyMCBsLTQuNzggMCBsMCAtMTQuMjQgbDQuNzggMCBjNC4wMiAwIDcuMyAzLjIgNy4zIDcuMTIgcy0zLjI4IDcuMTIgLTcuMyA3LjEyIHogTTIwLjIyMDAwMDAwMDAwMDAwMiAxNy4zOCBsMi4xMiAwIGMyLjU2IDAgNC42NCAtMi4wMiA0LjY0IC00LjUgcy0yLjA4IC00LjUgLTQuNjQgLTQuNSBsLTIuMTIgMCBsMCA5IHogTTM1LjIgMjAgbC0yLjY4IDAgbDAgLTE0LjI0IGwyLjY4IDAgbDAgMTQuMjQgeiBNNDMuODIgMjAuMTIgYy0wLjQ2IDAgLTAuOTQgLTAuMDYgLTEuNDQgLTAuMTYgYy0xLjQ4IC0wLjMgLTIuOTIgLTEuMDIgLTQuMTggLTIuMTIgbC0wLjM4IC0wLjM0IGwxLjc2IC0yIGwwLjM4IDAuMzQgYzAuOTIgMC44IDEuOTQgMS4zNCAyLjk0IDEuNTQgbDAuMDIgMCBjMC4zIDAuMDYgMC42IDAuMSAwLjkgMC4xIGMwLjUgMCAwLjk2IC0wLjEgMS4zNCAtMC4yOCBjMC40OCAtMC4yIDEuMDQgLTAuNjQgMS4wNCAtMS40NiBjMCAtMC40NCAtMC4yMiAtMC43OCAtMC42OCAtMS4wNiBjLTAuNTYgLTAuMzQgLTEuMzIgLTAuNTIgLTEuODYgLTAuNjIgYy0wLjI0IC0wLjA0IC0yLjI4IC0wLjQ2IC0zLjIyIC0wLjk4IGMtMC42MiAtMC4zOCAtMS4xIC0wLjg2IC0xLjQ0IC0xLjQyIGMtMC4zNCAtMC41OCAtMC41IC0xLjIyIC0wLjUgLTEuOTIgYzAgLTAuNzYgMC4yNCAtMS41MiAwLjcgLTIuMjIgYzAuNDQgLTAuNTggMS4wNCAtMS4wNiAxLjc2IC0xLjQgczEuNTIgLTAuNTIgMi4zOCAtMC41MiBjMC4zNCAwIDAuNyAwLjA0IDEuMDYgMC4wOCBjMS4zMiAwLjI0IDIuNjIgMC44NCAzLjc2IDEuOCBsMC4zOCAwLjMyIGwtMS43IDIuMDYgbC0wLjM4IC0wLjMyIGMtMS4zIC0xLjA2IC0yLjQyIC0xLjMgLTMuMTQgLTEuMyBjLTAuNDYgMCAtMC44OCAwLjEgLTEuMjQgMC4yNiBjLTAuNTYgMC4yNiAtMC45MiAwLjc0IC0wLjkyIDEuMjIgYzAgMC40NCAwLjE2IDAuNzIgMC41NCAwLjk4IHMwLjk2IDAuNDYgMS44OCAwLjY2IGMwLjEyIDAuMDIgMC4yOCAwLjA2IDAuNDQgMC4xIGMwLjg0IDAuMTYgMS45NiAwLjQgMi43NCAwLjg2IGMwLjY4IDAuMzYgMS4yIDAuODYgMS41NiAxLjQ0IHMwLjU0IDEuMjYgMC41NCAxLjk4IGMwIDAuOSAtMC4yNCAxLjcgLTAuNzIgMi4zOCBjLTAuNDIgMC41OCAtMS4wNCAxLjA4IC0xLjg2IDEuNDggYy0wLjcgMC4zNiAtMS40OCAwLjUyIC0yLjQ2IDAuNTIgeiBNNjAuNyAyMCBsLTkuMiAwIGwwIC0xNC4yNCBsOS4zOCAwIGwwIDIuNiBsLTYuNyAwIGwwIDIuMSBsNS44NCAwIGwwIDIuNjYgbC01Ljg0IDAgbDAgNC4yNCBsNi41MiAwIGwwIDIuNjQgeiBNNzUuMzIwMDAwMDAwMDAwMDEgMjAgbC0yLjg4IDAgbC0xLjQ2IC0zLjg0IGwtNC43MiAwIGwtMS40OCAzLjg0IGwtMi44NiAwIGw1LjQ4IC0xNC4yNCBsMi40MiAwIHogTTY3LjMgMTMuNTIgbDIuNjQgMCBsLTEuMzIgLTMuNDYgeiI+PC9wYXRoPjwvZz48ZyBpZD0iU3ZnanNHMTI4OCIgZmVhdHVyZUtleT0iOElka2tqLTEiIHRyYW5zZm9ybT0ibWF0cml4KDQuNjY5OTg3NzAxOTk1MTc1LDAsMCw0LjY2OTk4NzcwMTk5NTE3NSwtMi41MjE3OTMxODA5MzE1MDEsNDUuMTU1NjYyMzk2OTA1NDg0KSIgZmlsbD0iI2Y2ZjZmNiI+PHBhdGggZD0iTTYuNzIgMjAgbC0yLjY4IDAgbDAgLTExLjYgbC0zLjUgMCBsMCAtMi42NCBsOS42OCAwIGwwIDIuNjQgbC0zLjUgMCBsMCAxMS42IHogTTE4LjQ2IDIwLjIgYy00LjEgMCAtNy40NCAtMy4zMiAtNy40NCAtNy40MiBjMCAtNC4xMiAzLjM0IC03LjQ2IDcuNDQgLTcuNDYgYzQuMTIgMCA3LjQ2IDMuMzQgNy40NiA3LjQ2IGMwIDQuMSAtMy4zNCA3LjQyIC03LjQ2IDcuNDIgeiBNMTguNDYgNy45OCBjLTIuNjIgMCAtNC43NiAyLjE0IC00Ljc2IDQuOCBjMCAyLjY0IDIuMTQgNC43OCA0Ljc2IDQuNzggczQuNzYgLTIuMTQgNC43NiAtNC43OCBjMCAtMi42NiAtMi4xNCAtNC44IC00Ljc2IC00LjggeiBNMzMuMzAwMDAwMDAwMDAwMDA0IDIwLjIgYy0zLjA2IDAgLTUuNTQgLTIuNDggLTUuNTQgLTUuNTQgbDAgLTguOSBsMi42NiAwIGwwIDguOSBjMCAxLjYgMS4zIDIuOTIgMi44OCAyLjkyIGMxLjYgMCAyLjg4IC0xLjMyIDIuODggLTIuOTIgbDAgLTguOSBsMi42OCAwIGwwIDguOSBjMCAxLjQ4IC0wLjU4IDIuODggLTEuNjIgMy45MiBjLTEuMDYgMS4wNCAtMi40NiAxLjYyIC0zLjk0IDEuNjIgeiBNNTMuNTIgMjAgbC0zLjE2IDAgbC01LjA2IC02Ljk2IGwtMS4xNCAwIGwwIDYuOTYgbC0yLjYgMCBsMCAtMTQuMjQgbDUuMSAwIGMwLjk2IDAgMS44NiAwLjM4IDIuNTYgMS4wOCBzMS4wOCAxLjYgMS4wOCAyLjU2IGMwIDEuNDIgLTAuODQgMi43IC0yLjA0IDMuMyB6IE00NC4xNjAwMDAwMDAwMDAwMDQgMTAuNDQgbDIuNSAwIGMwLjU2IDAgMS4wNCAtMC40NiAxLjA0IC0xLjA0IHMtMC40OCAtMS4wNCAtMS4wNCAtMS4wNCBsLTIuNSAwIGwwIDIuMDggeiBNNTkuNzQgMjAuMTIgYy0wLjQ2IDAgLTAuOTQgLTAuMDYgLTEuNDQgLTAuMTYgYy0xLjQ4IC0wLjMgLTIuOTIgLTEuMDIgLTQuMTggLTIuMTIgbC0wLjM4IC0wLjM0IGwxLjc2IC0yIGwwLjM4IDAuMzQgYzAuOTIgMC44IDEuOTQgMS4zNCAyLjk0IDEuNTQgbDAuMDIgMCBjMC4zIDAuMDYgMC42IDAuMSAwLjkgMC4xIGMwLjUgMCAwLjk2IC0wLjEgMS4zNCAtMC4yOCBjMC40OCAtMC4yIDEuMDQgLTAuNjQgMS4wNCAtMS40NiBjMCAtMC40NCAtMC4yMiAtMC43OCAtMC42OCAtMS4wNiBjLTAuNTYgLTAuMzQgLTEuMzIgLTAuNTIgLTEuODYgLTAuNjIgYy0wLjI0IC0wLjA0IC0yLjI4IC0wLjQ2IC0zLjIyIC0wLjk4IGMtMC42MiAtMC4zOCAtMS4xIC0wLjg2IC0xLjQ0IC0xLjQyIGMtMC4zNCAtMC41OCAtMC41IC0xLjIyIC0wLjUgLTEuOTIgYzAgLTAuNzYgMC4yNCAtMS41MiAwLjcgLTIuMjIgYzAuNDQgLTAuNTggMS4wNCAtMS4wNiAxLjc2IC0xLjQgczEuNTIgLTAuNTIgMi4zOCAtMC41MiBjMC4zNCAwIDAuNyAwLjA0IDEuMDYgMC4wOCBjMS4zMiAwLjI0IDIuNjIgMC44NCAzLjc2IDEuOCBsMC4zOCAwLjMyIGwtMS43IDIuMDYgbC0wLjM4IC0wLjMyIGMtMS4zIC0xLjA2IC0yLjQyIC0xLjMgLTMuMTQgLTEuMyBjLTAuNDYgMCAtMC44OCAwLjEgLTEuMjQgMC4yNiBjLTAuNTYgMC4yNiAtMC45MiAwLjc0IC0wLjkyIDEuMjIgYzAgMC40NCAwLjE2IDAuNzIgMC41NCAwLjk4IHMwLjk2IDAuNDYgMS44OCAwLjY2IGMwLjEyIDAuMDIgMC4yOCAwLjA2IDAuNDQgMC4xIGMwLjg0IDAuMTYgMS45NiAwLjQgMi43NCAwLjg2IGMwLjY4IDAuMzYgMS4yIDAuODYgMS41NiAxLjQ0IHMwLjU0IDEuMjYgMC41NCAxLjk4IGMwIDAuOSAtMC4yNCAxLjcgLTAuNzIgMi4zOCBjLTAuNDIgMC41OCAtMS4wNCAxLjA4IC0xLjg2IDEuNDggYy0wLjcgMC4zNiAtMS40OCAwLjUyIC0yLjQ2IDAuNTIgeiI+PC9wYXRoPjwvZz48ZyBpZD0iU3ZnanNHMTI4OSIgZmVhdHVyZUtleT0iNGpwMUJMLTAiIHRyYW5zZm9ybT0ibWF0cml4KDAuNzU2NDg2NzczNjU5NDAyMSwwLDAsMC43NTY0ODY3NzM2NTk0MDIxLDI5LjgzMzU3MjcwNzc5MTE3LDE1NC44NTQ0NjcyNTU0Nzg3NykiIGZpbGw9IiNmZmI0MDAiPjxwYXRoIGQ9Ik0xMS4yNiA1Ljg0IGwwIDEuOCBsLTQuNTYgMCBsMCAxMi4zNiBsLTEuOTIgMCBsMCAtMTIuMzYgbC00LjU2IDAgbDAgLTEuOCBsMTEuMDQgMCB6IE0yNS42MjggNS44NCBjMS4zODY3IDAgMi40NzM0IDAuMzQ2NjYgMy4yNiAxLjA0IHMxLjE4IDEuNjY2NyAxLjE4IDIuOTIgYzAgMC45NDY2NiAtMC4zMjMzNCAxLjc3MzMgLTAuOTcgMi40OCBzLTEuNDc2NyAxLjEyNjcgLTIuNDkgMS4yNiBsLTAuMDIgMCBsNC4wMiA2LjQ2IGwtMi40IDAgbC0zLjYgLTYuMjQgbC0yLjE0IDAgbDAgNi4yNCBsLTEuOTIgMCBsMCAtMTQuMTYgbDUuMDggMCB6IE0yNS4wNjggMTIuMDggYzEgMCAxLjc0MzMgLTAuMTgzMzYgMi4yMyAtMC41NTAwMiBzMC43MyAtMC45NDMzMiAwLjczIC0xLjczIGMwIC0xLjUyIC0wLjk4NjY2IC0yLjI4IC0yLjk2IC0yLjI4IGwtMi42IDAgbDAgNC41NiBsMi42IDAgeiBNNDYuMTk2MDAwMDAwMDAwMDA1IDUuODQgbDYuMDYgMTQuMTYgbC0yLjI0IDAgbC0xLjQyIC0zLjUgbC02Ljc0IDAgbC0xLjQgMy41IGwtMi4yNCAwIGw2LjI0IC0xNC4xNiBsMS43NCAwIHogTTQyLjUzNiAxNC44MiBsNS4zNiAwIGwtMi42NCAtNi41IGwtMC4wNCAwIHogTTU5Ljc4NDAwMDAwMDAwMDAwNiA1Ljg0IGw0LjE2IDExLjUyIGwwLjA0IDAgbDQuMzIgLTExLjUyIGwyLjEgMCBsLTUuNTggMTQuMTYgbC0xLjggMCBsLTUuNDYgLTE0LjE2IGwyLjIyIDAgeiBNODguNDkyMDAwMDAwMDAwMDIgNS44NCBsMCAxLjggbC03LjIyIDAgbDAgNC4yMiBsNi43MiAwIGwwIDEuOCBsLTYuNzIgMCBsMCA0LjU0IGw3LjU4IDAgbDAgMS44IGwtOS41IDAgbDAgLTE0LjE2IGw5LjE0IDAgeiBNMTAwLjc0MDAwMDAwMDAwMDAxIDUuODQgbDAgMTIuMzYgbDYuNSAwIGwwIDEuOCBsLTguNDIgMCBsMCAtMTQuMTYgbDEuOTIgMCB6IE0xMzMuMzE2MDAwMDAwMDAwMDMgNS40OCBjMS44NCAwIDMuMiAwLjU0MDA2IDQuMDggMS42MjAxIGwtMS41NiAxLjQyIGMtMC4yNCAtMC4zNzMzNCAtMC41OCAtMC42NzMzNCAtMS4wMiAtMC45IHMtMC45NDY2NiAtMC4zNCAtMS41MiAtMC4zNCBjLTAuODI2NjYgMCAtMS40OSAwLjIwMzM0IC0xLjk5IDAuNjEgcy0wLjc1IDAuOTMgLTAuNzUgMS41NyBjMCAxLjA2NjcgMC43MDY2NiAxLjgxMzMgMi4xMiAyLjI0IGwxLjc4IDAuNTggYzEgMC4zMiAxLjc2MzMgMC43NjY2NiAyLjI5IDEuMzQgczAuNzkgMS4zNiAwLjc5IDIuMzYgYzAgMS4zMDY3IC0wLjQ2MzM0IDIuMzYzNCAtMS4zOSAzLjE3IHMtMi4xMDM0IDEuMjEgLTMuNTMgMS4yMSBjLTIuMDQgMCAtMy41NDY2IC0wLjY1MzM0IC00LjUyIC0xLjk2IGwxLjU4IC0xLjM2IGMwLjMwNjY2IDAuNDggMC43MjY2NiAwLjg1MzM0IDEuMjYgMS4xMiBzMS4xMTMzIDAuNCAxLjc0IDAuNCBjMC43ODY2NiAwIDEuNDUzMyAtMC4yMjY2NiAyIC0wLjY4IHMwLjgyIC0xLjAxMzMgMC44MiAtMS42OCBjMCAtMC40OTMzNCAtMC4xNjY2NiAtMC45MDY2OCAtMC41IC0xLjI0IHMtMC45MzMzNCAtMC42MzMzNCAtMS44IC0wLjkgbC0xLjI2IC0wLjQyIGMtMS4yNjY3IC0wLjQyNjY2IC0yLjE1MzQgLTAuOTcgLTIuNjYgLTEuNjMgcy0wLjc2IC0xLjUxIC0wLjc2IC0yLjU1IGMwIC0xLjEwNjcgMC40NDY2NiAtMi4wNDY2IDEuMzQgLTIuODIgczIuMDQ2NiAtMS4xNiAzLjQ2IC0xLjE2IHogTTE1Mi43MDQwMDAwMDAwMDAwNCA1Ljg0IGMxLjM3MzMgMCAyLjQ1NjYgMC4zNCAzLjI1IDEuMDIgczEuMTkgMS42NiAxLjE5IDIuOTQgYzAgMS4yNCAtMC4zOTMzNCAyLjIxIC0xLjE4IDIuOTEgcy0xLjg3MzMgMS4wNSAtMy4yNiAxLjA1IGwtMy4xNiAwIGwwIDYuMjQgbC0xLjkyIDAgbDAgLTE0LjE2IGw1LjA4IDAgeiBNMTUyLjE0NDAwMDAwMDAwMDAzIDEyLjA4IGMxIDAgMS43NDMzIC0wLjE4MzM2IDIuMjMgLTAuNTUwMDIgczAuNzMgLTAuOTQzMzIgMC43MyAtMS43MyBjMCAtMS41MiAtMC45ODY2NiAtMi4yOCAtMi45NiAtMi4yOCBsLTIuNiAwIGwwIDQuNTYgbDIuNiAwIHogTTE3NS44NzIwMDAwMDAwMDAwNCA1Ljg0IGwwIDEuOCBsLTcuMjIgMCBsMCA0LjIyIGw2LjcyIDAgbDAgMS44IGwtNi43MiAwIGwwIDQuNTQgbDcuNTggMCBsMCAxLjggbC05LjUgMCBsMCAtMTQuMTYgbDkuMTQgMCB6IE0xOTIuNzAwMDAwMDAwMDAwMDUgNS40OCBjMSAwIDEuOTM2NyAwLjE4NjY0IDIuODEgMC41NTk5OCBzMS41OSAwLjkyIDIuMTUgMS42NCBsLTEuNiAxLjIyIGMtMC44NjY2NiAtMS4wOCAtMi4wMDY2IC0xLjYyIC0zLjQyIC0xLjYyIGMtMS41MzMzIDAgLTIuNzk2NiAwLjU0NjY2IC0zLjc5IDEuNjQgcy0xLjQ5IDIuNDY2NiAtMS40OSA0LjEyIGMwIDEuNiAwLjQ5IDIuOTIgMS40NyAzLjk2IHMyLjI1IDEuNTYgMy44MSAxLjU2IHMyLjc5MzQgLTAuNjMzMzQgMy43IC0xLjkgbDEuNjIgMS4yMiBjLTAuNTYgMC43NDY2NiAtMS4zMDY3IDEuMzQ2NyAtMi4yNCAxLjggcy0xLjk3MzMgMC42OCAtMy4xMiAwLjY4IGMtMS4zNiAwIC0yLjU5MzQgLTAuMzMgLTMuNyAtMC45OSBzLTEuOTggLTEuNTY2NyAtMi42MiAtMi43MiBzLTAuOTYgLTIuMzYzNCAtMC45NiAtMy42MyBjMCAtMi4xODY2IDAuNjg2NjYgLTMuOTkgMi4wNiAtNS40MSBzMy4xNDY2IC0yLjEzIDUuMzIgLTIuMTMgeiBNMjA5LjQ0ODAwMDAwMDAwMDA2IDUuODQgbDAgMTQuMTYgbC0xLjkyIDAgbDAgLTE0LjE2IGwxLjkyIDAgeiBNMjI2LjUxNjAwMDAwMDAwMDA1IDUuODQgbDYuMDYgMTQuMTYgbC0yLjI0IDAgbC0xLjQyIC0zLjUgbC02Ljc0IDAgbC0xLjQgMy41IGwtMi4yNCAwIGw2LjI0IC0xNC4xNiBsMS43NCAwIHogTTIyMi44NTYwMDAwMDAwMDAwNSAxNC44MiBsNS4zNiAwIGwtMi42NCAtNi41IGwtMC4wNCAwIHogTTI0My41ODQwMDAwMDAwMDAwNiA1Ljg0IGwwIDEyLjM2IGw2LjUgMCBsMCAxLjggbC04LjQyIDAgbDAgLTE0LjE2IGwxLjkyIDAgeiBNMjYxLjIxMjAwMDAwMDAwMDA1IDUuODQgbDAgMTQuMTYgbC0xLjkyIDAgbDAgLTE0LjE2IGwxLjkyIDAgeiBNMjc2LjE2IDUuNDggYzEuODQgMCAzLjIgMC41NDAwNiA0LjA4IDEuNjIwMSBsLTEuNTYgMS40MiBjLTAuMjQgLTAuMzczMzQgLTAuNTggLTAuNjczMzQgLTEuMDIgLTAuOSBzLTAuOTQ2NjYgLTAuMzQgLTEuNTIgLTAuMzQgYy0wLjgyNjY2IDAgLTEuNDkgMC4yMDMzNCAtMS45OSAwLjYxIHMtMC43NSAwLjkzIC0wLjc1IDEuNTcgYzAgMS4wNjY3IDAuNzA2NjYgMS44MTMzIDIuMTIgMi4yNCBsMS43OCAwLjU4IGMxIDAuMzIgMS43NjMzIDAuNzY2NjYgMi4yOSAxLjM0IHMwLjc5IDEuMzYgMC43OSAyLjM2IGMwIDEuMzA2NyAtMC40NjMzNCAyLjM2MzQgLTEuMzkgMy4xNyBzLTIuMTAzNCAxLjIxIC0zLjUzIDEuMjEgYy0yLjA0IDAgLTMuNTQ2NiAtMC42NTMzNCAtNC41MiAtMS45NiBsMS41OCAtMS4zNiBjMC4zMDY2NiAwLjQ4IDAuNzI2NjYgMC44NTMzNCAxLjI2IDEuMTIgczEuMTEzMyAwLjQgMS43NCAwLjQgYzAuNzg2NjYgMCAxLjQ1MzMgLTAuMjI2NjYgMiAtMC42OCBzMC44MiAtMS4wMTMzIDAuODIgLTEuNjggYzAgLTAuNDkzMzQgLTAuMTY2NjYgLTAuOTA2NjggLTAuNSAtMS4yNCBzLTAuOTMzMzQgLTAuNjMzMzQgLTEuOCAtMC45IGwtMS4yNiAtMC40MiBjLTEuMjY2NyAtMC40MjY2NiAtMi4xNTM0IC0wLjk3IC0yLjY2IC0xLjYzIHMtMC43NiAtMS41MSAtMC43NiAtMi41NSBjMCAtMS4xMDY3IDAuNDQ2NjYgLTIuMDQ2NiAxLjM0IC0yLjgyIHMyLjA0NjYgLTEuMTYgMy40NiAtMS4xNiB6IE0yOTkuOTA4IDUuODQgbDAgMS44IGwtNC41NiAwIGwwIDEyLjM2IGwtMS45MiAwIGwwIC0xMi4zNiBsLTQuNTYgMCBsMCAtMS44IGwxMS4wNCAwIHogTTMxMy4yNTYwMDAwMDAwMDAwMyA1LjQ4IGMxLjg0IDAgMy4yIDAuNTQwMDYgNC4wOCAxLjYyMDEgbC0xLjU2IDEuNDIgYy0wLjI0IC0wLjM3MzM0IC0wLjU4IC0wLjY3MzM0IC0xLjAyIC0wLjkgcy0wLjk0NjY2IC0wLjM0IC0xLjUyIC0wLjM0IGMtMC44MjY2NiAwIC0xLjQ5IDAuMjAzMzQgLTEuOTkgMC42MSBzLTAuNzUgMC45MyAtMC43NSAxLjU3IGMwIDEuMDY2NyAwLjcwNjY2IDEuODEzMyAyLjEyIDIuMjQgbDEuNzggMC41OCBjMSAwLjMyIDEuNzYzMyAwLjc2NjY2IDIuMjkgMS4zNCBzMC43OSAxLjM2IDAuNzkgMi4zNiBjMCAxLjMwNjcgLTAuNDYzMzQgMi4zNjM0IC0xLjM5IDMuMTcgcy0yLjEwMzQgMS4yMSAtMy41MyAxLjIxIGMtMi4wNCAwIC0zLjU0NjYgLTAuNjUzMzQgLTQuNTIgLTEuOTYgbDEuNTggLTEuMzYgYzAuMzA2NjYgMC40OCAwLjcyNjY2IDAuODUzMzQgMS4yNiAxLjEyIHMxLjExMzMgMC40IDEuNzQgMC40IGMwLjc4NjY2IDAgMS40NTMzIC0wLjIyNjY2IDIgLTAuNjggczAuODIgLTEuMDEzMyAwLjgyIC0xLjY4IGMwIC0wLjQ5MzM0IC0wLjE2NjY2IC0wLjkwNjY4IC0wLjUgLTEuMjQgcy0wLjkzMzM0IC0wLjYzMzM0IC0xLjggLTAuOSBsLTEuMjYgLTAuNDIgYy0xLjI2NjcgLTAuNDI2NjYgLTIuMTUzNCAtMC45NyAtMi42NiAtMS42MyBzLTAuNzYgLTEuNTEgLTAuNzYgLTIuNTUgYzAgLTEuMTA2NyAwLjQ0NjY2IC0yLjA0NjYgMS4zNCAtMi44MiBzMi4wNDY2IC0xLjE2IDMuNDYgLTEuMTYgeiI+PC9wYXRoPjwvZz4KCQkJPC9nPgoJCTwvc3ZnPgoJ',

  generate(quoteId) {
    const q = DB.getQuotes().find(x => x.id === quoteId);
    if (!q) { alert('Quote not found.'); return; }
    this._openPrintWindow(q, this.LOGO_URI);
  },

  _openPrintWindow(q, logoBase64) {
    const c = q.costs || {};
    const cur = q.currency || 'EUR';
    const f = (v) => fmt(v, cur);
    const quoteNum = 'Q-' + String(q.id).padStart(4, '0');
    const dest = q.destination || '—';
    const dateRange = fmtDate(q.startDate) + ' — ' + fmtDate(q.endDate);
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    // Hotel info
    let hotelRows = '';
    if (q.hotels && q.hotels.length) {
      q.hotels.forEach(h => {
        const rooms = (h.rooms || []).map(r => `${r.qty}x ${r.type}`).join(', ');
        hotelRows += `<tr>
          <td>${h.hotelName || '—'} ${'★'.repeat(h.starRating || 0)}</td>
          <td>${h.city || dest}</td>
          <td>${h.nights || q.nights} nights</td>
          <td>${rooms}</td>
          <td>${h.mealPlan || '—'}</td>
        </tr>`;
      });
    }

    // Activities (no costs shown — What's Included covers it)
    let actRows = '';
    const activities = q.activities || [];
    activities.forEach(a => {
      actRows += `<tr><td>${a.name}</td><td>${a.destination || '—'}</td></tr>`;
    });

    // Pricing
    const totalRevenue = ((q.priceStudent || 0) * (q.numStudents || 0)) +
                         ((q.priceSibling || 0) * (q.numSiblings || 0)) +
                         ((q.priceAdult || 0) * (q.numAdults || 0));

    // What's included list
    const included = [];
    if (q.hotels && q.hotels.length) {
      q.hotels.forEach(h => {
        included.push(`${h.nights || q.nights}-night accommodation at ${h.hotelName || 'hotel'} (${h.city || dest})`);
        if (h.mealPlan && h.mealPlan !== 'None') included.push(`${h.mealPlan} meal plan (${h.city || dest})`);
      });
    }
    if (q.flightCostPerPerson) included.push('Return flights');
    if (q.airportTransfers) included.push('Airport transfers');
    if (q.coachHire) included.push('Coach / bus hire');
    if (q.internalTransport) included.push('Internal transport');
    if (q.numGuides) included.push(`${q.numGuides} professional guide${q.numGuides > 1 ? 's' : ''}`);
    if (q.numFOC) included.push(`${q.numFOC} FOC place${q.numFOC > 1 ? 's' : ''} for teachers / coaches`);
    activities.forEach(a => {
      if (!a.isFree) included.push(a.name);
      else included.push(`${a.name} (complimentary)`);
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Quote ${quoteNum} — Odisea Tours</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  @page {
    size: A4;
    margin: 0;
  }

  body {
    font-family: 'DM Sans', sans-serif;
    color: #111111;
    background: #ffffff;
    font-size: 10pt;
    line-height: 1.5;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    position: relative;
    overflow: hidden;
  }

  /* ---- HEADER ---- */
  .header {
    background: #111111;
    padding: 28px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .header img {
    height: 60px;
  }
  .header-right {
    text-align: right;
    color: #ffffff;
  }
  .header-right .quote-num {
    font-family: 'Playfair Display', serif;
    font-size: 18pt;
    font-weight: 700;
    color: #ffb400;
  }
  .header-right .quote-date {
    font-size: 9pt;
    opacity: 0.7;
    margin-top: 2px;
  }

  /* ---- AMBER STRIP ---- */
  .amber-strip {
    background: #ffb400;
    padding: 14px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .amber-strip .tour-name {
    font-family: 'Playfair Display', serif;
    font-size: 16pt;
    font-weight: 700;
    color: #111111;
  }
  .amber-strip .dest {
    font-size: 11pt;
    font-weight: 600;
    color: #111111;
  }

  /* ---- BODY ---- */
  .body {
    padding: 24px 40px 20px;
  }

  /* Client / Tour info grid */
  .info-grid {
    display: flex;
    gap: 30px;
    margin-bottom: 20px;
  }
  .info-block {
    flex: 1;
    background: #f6f6f6;
    border-radius: 6px;
    padding: 14px 18px;
  }
  .info-block h4 {
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #ffb400;
    margin-bottom: 8px;
    font-weight: 700;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    font-size: 9pt;
    padding: 2px 0;
  }
  .info-row .label { color: #666; }
  .info-row .value { font-weight: 600; color: #111; }

  /* Section titles */
  .section-title {
    font-family: 'Playfair Display', serif;
    font-size: 12pt;
    font-weight: 700;
    color: #111111;
    margin: 20px 0 10px;
    padding-bottom: 4px;
    border-bottom: 2px solid #ffb400;
    display: inline-block;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    font-size: 9pt;
  }
  thead th {
    background: #111111;
    color: #ffffff;
    padding: 7px 10px;
    text-align: left;
    font-weight: 600;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  thead th:first-child { border-radius: 4px 0 0 0; }
  thead th:last-child { border-radius: 0 4px 0 0; }
  tbody td {
    padding: 7px 10px;
    border-bottom: 1px solid #e8e8e8;
  }
  tbody tr:nth-child(even) { background: #fafafa; }
  tbody tr:last-child td { border-bottom: none; }

  /* Cost breakdown */
  .cost-table { margin-top: 8px; }
  .cost-table td { padding: 5px 10px; }
  .cost-table td:last-child { text-align: right; font-weight: 600; }
  .cost-table .subtotal td {
    border-top: 2px solid #111111;
    font-weight: 700;
    font-size: 10pt;
    padding-top: 8px;
  }

  /* Pricing cards */
  .pricing-row {
    display: flex;
    gap: 16px;
    margin: 14px 0 20px;
  }
  .price-box {
    flex: 1;
    text-align: center;
    background: #f6f6f6;
    border-radius: 8px;
    padding: 14px 10px;
    border-top: 3px solid #ffb400;
  }
  .price-box .cat {
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #666;
    margin-bottom: 4px;
    font-weight: 600;
  }
  .price-box .amt {
    font-family: 'Playfair Display', serif;
    font-size: 18pt;
    font-weight: 700;
    color: #111111;
  }
  .price-box .per {
    font-size: 8pt;
    color: #999;
  }

  /* Included list */
  .included-list {
    columns: 2;
    column-gap: 30px;
    margin: 8px 0 16px;
  }
  .included-list li {
    font-size: 9pt;
    padding: 3px 0;
    break-inside: avoid;
    list-style: none;
    position: relative;
    padding-left: 16px;
  }
  .included-list li::before {
    content: '\\2713';
    position: absolute;
    left: 0;
    color: #ffb400;
    font-weight: 700;
  }

  /* Footer */
  .footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: #111111;
    color: #ffffff;
    padding: 14px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8pt;
  }
  .footer a { color: #ffb400; text-decoration: none; }
  .footer .tagline {
    color: #ffb400;
    font-style: italic;
    font-size: 8.5pt;
  }

  /* Terms */
  .terms {
    font-size: 7.5pt;
    color: #888;
    margin-top: 16px;
    padding-top: 10px;
    border-top: 1px solid #e0e0e0;
    line-height: 1.6;
  }
  .terms strong { color: #666; }

  @media print {
    body { background: white; }
    .page { margin: 0; box-shadow: none; }
    .no-print { display: none !important; }
  }

  @media screen {
    body { background: #e0e0e0; padding: 20px; }
    .page { box-shadow: 0 4px 30px rgba(0,0,0,0.15); border-radius: 4px; overflow: hidden; margin-bottom: 20px; }
  }

  /* Print button */
  .print-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #111;
    padding: 10px 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    z-index: 999;
    box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  }
  .print-bar button {
    background: #ffb400;
    border: none;
    color: #111;
    padding: 8px 28px;
    border-radius: 6px;
    font-family: 'DM Sans', sans-serif;
    font-size: 11pt;
    font-weight: 700;
    cursor: pointer;
  }
  .print-bar button:hover { background: #e5a200; }
  .print-bar span { color: #fff; font-size: 10pt; }
</style>
</head>
<body>

<div class="print-bar no-print">
  <span>Quote ${quoteNum} — ${q.tourName || 'Untitled'}</span>
  <button onclick="window.print()">Save as PDF / Print</button>
  <button onclick="window.close()" style="background:#333;color:#fff">Close</button>
</div>

<div class="page" style="padding-top:0${/* leave room for print bar on screen */''}">
  <!-- HEADER -->
  <div class="header">
    ${logoBase64 ? `<img src="${logoBase64}" alt="Odisea Tours">` : '<div style="color:#fff;font-size:18pt;font-weight:700">ODISEA TOURS</div>'}
    <div class="header-right">
      <div class="quote-num">${quoteNum}</div>
      <div class="quote-date">${today}</div>
    </div>
  </div>

  <!-- AMBER STRIP -->
  <div class="amber-strip">
    <div class="tour-name">${q.tourName || 'Tour Proposal'}</div>
    <div class="dest">${dest} &bull; ${q.nights} Nights</div>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- Info grid -->
    <div class="info-grid">
      <div class="info-block">
        <h4>Client Details</h4>
        <div class="info-row"><span class="label">Organisation</span><span class="value">${q.clientName || '—'}</span></div>
        <div class="info-row"><span class="label">Email</span><span class="value">${q.clientEmail || '—'}</span></div>
        <div class="info-row"><span class="label">Phone</span><span class="value">${q.clientPhone || '—'}</span></div>
      </div>
      <div class="info-block">
        <h4>Tour Details</h4>
        <div class="info-row"><span class="label">Destination</span><span class="value">${dest}</span></div>
        <div class="info-row"><span class="label">Dates</span><span class="value">${dateRange}</span></div>
        <div class="info-row"><span class="label">Duration</span><span class="value">${q.nights} nights / ${(q.nights || 0) + 1} days</span></div>
        <div class="info-row"><span class="label">Group</span><span class="value">${q.numStudents || 0} students, ${q.numSiblings || 0} siblings, ${q.numAdults || 0} adults</span></div>
        ${(q.numFOC || 0) > 0 ? `<div class="info-row"><span class="label">FOC Places</span><span class="value">${q.numFOC} (teachers / coaches)</span></div>` : ''}
      </div>
    </div>

    ${hotelRows ? `
    <!-- Hotels -->
    <div class="section-title">Accommodation</div>
    <table>
      <thead><tr><th>Hotel</th><th>City</th><th>Duration</th><th>Rooms</th><th>Meal Plan</th></tr></thead>
      <tbody>${hotelRows}</tbody>
    </table>` : ''}

    ${actRows ? `
    <!-- Activities -->
    <div class="section-title">Activities & Excursions</div>
    <table>
      <thead><tr><th>Activity</th><th>Location</th></tr></thead>
      <tbody>${actRows}</tbody>
    </table>` : ''}

    <!-- What's Included -->
    <div class="section-title">What's Included</div>
    <ul class="included-list">
      ${included.map(item => `<li>${item}</li>`).join('')}
    </ul>

    <!-- Pricing -->
    <div class="section-title">Price Per Person</div>
    <div class="pricing-row">
      <div class="price-box">
        <div class="cat">Student / Player</div>
        <div class="amt">${f(q.priceStudent || 0)}</div>
        <div class="per">per person</div>
      </div>
      ${(q.numSiblings || 0) > 0 ? `<div class="price-box">
        <div class="cat">Sibling</div>
        <div class="amt">${f(q.priceSibling || 0)}</div>
        <div class="per">per person</div>
      </div>` : ''}
      <div class="price-box">
        <div class="cat">Adult</div>
        <div class="amt">${f(q.priceAdult || 0)}</div>
        <div class="per">per person</div>
      </div>
    </div>

    <!-- Cost summary (optional, shows total) -->
    <div class="info-grid">
      <div class="info-block" style="border-top:3px solid #ffb400">
        <h4>Group Summary</h4>
        <div class="info-row"><span class="label">${q.numStudents || 0} students &times; ${f(q.priceStudent || 0)}</span><span class="value">${f((q.priceStudent || 0) * (q.numStudents || 0))}</span></div>
        ${(q.numSiblings || 0) > 0 ? `<div class="info-row"><span class="label">${q.numSiblings} siblings &times; ${f(q.priceSibling || 0)}</span><span class="value">${f((q.priceSibling || 0) * q.numSiblings)}</span></div>` : ''}
        <div class="info-row"><span class="label">${q.numAdults || 0} adults &times; ${f(q.priceAdult || 0)}</span><span class="value">${f((q.priceAdult || 0) * (q.numAdults || 0))}</span></div>
        <div class="info-row" style="margin-top:6px;padding-top:6px;border-top:2px solid #111">
          <span class="label" style="font-weight:700;font-size:10pt;color:#111">TOTAL</span>
          <span class="value" style="font-size:12pt;color:#ffb400">${f(totalRevenue)}</span>
        </div>
      </div>
      <div class="info-block" style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center">
        <div style="font-size:8pt;text-transform:uppercase;letter-spacing:1.5px;color:#666;margin-bottom:6px;font-weight:600">Total Group Price</div>
        <div style="font-family:'Playfair Display',serif;font-size:26pt;font-weight:700;color:#111">${f(totalRevenue)}</div>
        <div style="font-size:8.5pt;color:#999;margin-top:4px">${(q.numStudents || 0) + (q.numSiblings || 0) + (q.numAdults || 0)} paying participants${(q.numFOC || 0) > 0 ? ' + ' + q.numFOC + ' FOC' : ''}</div>
      </div>
    </div>

    <!-- Terms -->
    <div class="terms">
      <strong>Terms & Conditions:</strong> This quote is valid for 14 days from the date of issue. Prices are based on the group size indicated and may vary if numbers change significantly.
      A deposit of 20% is required upon confirmation, with the remaining balance due 8 weeks before departure.
      Cancellation fees may apply as per our standard booking conditions. All prices include VAT where applicable.
      Travel insurance is not included and is strongly recommended for all participants.
      <br><br>
      <strong>Payment:</strong> Bank transfer or direct debit. Full payment details will be provided upon confirmation.
    </div>

  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>
      <strong>Odisea Tours</strong> &nbsp;|&nbsp; <a href="mailto:juan@odisea-tours.com">juan@odisea-tours.com</a> &nbsp;|&nbsp; Travel Specialists
    </div>
    <div class="tagline">Your adventure starts here</div>
  </div>
</div>

</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) { alert('Pop-up blocked. Please allow pop-ups for this page.'); return; }
    w.document.write(html);
    w.document.close();
  },

  /* ============================================================
     INVOICE PDF GENERATOR
     ============================================================ */
  generateInvoice(invoiceId) {
    const inv = DB.getInvoices().find(x => x.id === invoiceId);
    if (!inv) { alert('Invoice not found.'); return; }

    // Try to find linked tour/quote for full details
    let tour = null;
    if (inv.tourId) tour = DB.getTours().find(t => t.id === inv.tourId);
    // If no tour, try to find a quote matching tourName
    let quote = null;
    if (!tour) {
      quote = DB.getQuotes().find(q => q.tourName === inv.tourName || q.tourName + ' (Quote)' === inv.tourName);
    }
    const source = tour || quote || {};

    this._openInvoiceWindow(inv, source, this.LOGO_URI);
  },

  _openInvoiceWindow(inv, src, logoBase64) {
    const cur = inv.currency || 'EUR';
    const f = (v) => fmt(v, cur);
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const invNum = inv.number || ('INV-' + String(inv.id).padStart(4, '0'));
    const paid = (inv.payments || []).reduce((s, p) => s + Number(p.amount), 0);
    const balance = Number(inv.amount) - paid;
    const isPaid = balance <= 0;

    // Tour details from linked source
    const dest = src.destination || '';
    const dateRange = src.startDate ? (fmtDate(src.startDate) + ' — ' + fmtDate(src.endDate)) : '';
    const nights = src.nights || '';

    // Hotel info
    let hotelRows = '';
    if (src.hotels && src.hotels.length) {
      src.hotels.forEach(h => {
        const rooms = (h.rooms || []).map(r => `${r.qty}x ${r.type}`).join(', ');
        hotelRows += `<tr>
          <td>${h.hotelName || '—'} ${'★'.repeat(h.starRating || 0)}</td>
          <td>${h.city || dest}</td>
          <td>${h.nights || src.nights} nights</td>
          <td>${rooms}</td>
          <td>${h.mealPlan || '—'}</td>
        </tr>`;
      });
    }

    // Activities
    let actRows = '';
    (src.activities || []).forEach(a => {
      actRows += `<tr><td>${a.name}</td><td>${a.destination || '—'}</td></tr>`;
    });

    // What's included
    const included = [];
    if (src.hotels && src.hotels.length) {
      src.hotels.forEach(h => {
        included.push(`${h.nights || src.nights}-night accommodation at ${h.hotelName || 'hotel'} (${h.city || dest})`);
        if (h.mealPlan && h.mealPlan !== 'None') included.push(`${h.mealPlan} meal plan (${h.city || dest})`);
      });
    }
    if (src.flightCostPerPerson) included.push('Return flights');
    if (src.airportTransfers) included.push('Airport transfers');
    if (src.coachHire) included.push('Coach / bus hire');
    if (src.internalTransport) included.push('Internal transport');
    if (src.numGuides) included.push(`${src.numGuides} professional guide${src.numGuides > 1 ? 's' : ''}`);
    if (src.numFOC) included.push(`${src.numFOC} FOC place${src.numFOC > 1 ? 's' : ''} for teachers / coaches`);
    (src.activities || []).forEach(a => {
      if (!a.isFree) included.push(a.name);
      else included.push(`${a.name} (complimentary)`);
    });

    // Line items breakdown
    const lineItems = [];
    if (src.numStudents) lineItems.push({ desc: `Student / Player × ${src.numStudents}`, unit: f(src.priceStudent || 0), total: f((src.priceStudent || 0) * src.numStudents) });
    if (src.numSiblings) lineItems.push({ desc: `Sibling × ${src.numSiblings}`, unit: f(src.priceSibling || 0), total: f((src.priceSibling || 0) * src.numSiblings) });
    if (src.numAdults) lineItems.push({ desc: `Adult × ${src.numAdults}`, unit: f(src.priceAdult || 0), total: f((src.priceAdult || 0) * src.numAdults) });
    if (!lineItems.length) lineItems.push({ desc: inv.description || 'Tour Services', unit: f(inv.amount), total: f(inv.amount) });

    // Payment history
    let paymentRows = '';
    (inv.payments || []).forEach(p => {
      paymentRows += `<tr><td>${fmtDate(p.date)}</td><td>${p.method || '—'}</td><td style="text-align:right">${f(p.amount)}</td></tr>`;
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice ${invNum} — Odisea Tours</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4; margin: 0; }

  body {
    font-family: 'DM Sans', sans-serif;
    color: #111111;
    background: #ffffff;
    font-size: 10pt;
    line-height: 1.5;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    position: relative;
    overflow: hidden;
  }

  .header {
    background: #111111;
    padding: 28px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .header img { height: 60px; }
  .header-right { text-align: right; color: #ffffff; }
  .header-right .inv-num {
    font-family: 'Playfair Display', serif;
    font-size: 18pt;
    font-weight: 700;
    color: #ffb400;
  }
  .header-right .inv-date { font-size: 9pt; opacity: 0.7; margin-top: 2px; }

  .amber-strip {
    background: #ffb400;
    padding: 14px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .amber-strip .title {
    font-family: 'Playfair Display', serif;
    font-size: 16pt;
    font-weight: 700;
    color: #111111;
  }
  .amber-strip .status {
    font-size: 11pt;
    font-weight: 700;
    color: #111111;
    background: rgba(255,255,255,0.4);
    padding: 4px 16px;
    border-radius: 4px;
  }

  .body { padding: 24px 40px 20px; }

  .info-grid { display: flex; gap: 30px; margin-bottom: 20px; }
  .info-block { flex: 1; background: #f6f6f6; border-radius: 6px; padding: 14px 18px; }
  .info-block h4 {
    font-size: 8pt; text-transform: uppercase; letter-spacing: 1.5px;
    color: #ffb400; margin-bottom: 8px; font-weight: 700;
  }
  .info-row { display: flex; justify-content: space-between; font-size: 9pt; padding: 2px 0; }
  .info-row .label { color: #666; }
  .info-row .value { font-weight: 600; color: #111; }

  .section-title {
    font-family: 'Playfair Display', serif;
    font-size: 12pt; font-weight: 700; color: #111111;
    margin: 20px 0 10px; padding-bottom: 4px;
    border-bottom: 2px solid #ffb400; display: inline-block;
  }

  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 9pt; }
  thead th {
    background: #111111; color: #ffffff; padding: 7px 10px; text-align: left;
    font-weight: 600; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px;
  }
  thead th:first-child { border-radius: 4px 0 0 0; }
  thead th:last-child { border-radius: 0 4px 0 0; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #e8e8e8; }
  tbody tr:nth-child(even) { background: #fafafa; }
  tbody tr:last-child td { border-bottom: none; }

  .totals-block {
    background: #f6f6f6; border-radius: 6px; padding: 14px 18px;
    border-top: 3px solid #ffb400; margin-bottom: 20px;
  }
  .totals-row { display: flex; justify-content: space-between; font-size: 9.5pt; padding: 3px 0; }
  .totals-row .label { color: #666; }
  .totals-row .value { font-weight: 600; color: #111; }
  .totals-row.grand { margin-top: 8px; padding-top: 8px; border-top: 2px solid #111; }
  .totals-row.grand .label { font-weight: 700; font-size: 11pt; color: #111; }
  .totals-row.grand .value { font-size: 14pt; color: #ffb400; font-family: 'Playfair Display', serif; font-weight: 700; }
  .totals-row.balance { margin-top: 4px; }
  .totals-row.balance .value { color: ${isPaid ? '#22c55e' : '#ef4444'}; }

  .payment-box {
    background: #111111; border-radius: 8px; padding: 20px 24px; margin: 20px 0;
    color: #ffffff;
  }
  .payment-box h3 {
    font-family: 'Playfair Display', serif; color: #ffb400;
    margin-bottom: 12px; font-size: 12pt;
  }
  .bank-grid { display: flex; gap: 30px; }
  .bank-col { flex: 1; }
  .bank-row { font-size: 9pt; padding: 3px 0; display: flex; justify-content: space-between; }
  .bank-row .bl { color: #999; }
  .bank-row .bv { color: #fff; font-weight: 600; }
  .pay-online {
    margin-top: 14px; padding-top: 14px; border-top: 1px solid #333;
    text-align: center;
  }
  .pay-online a {
    display: inline-block; background: #ffb400; color: #111; padding: 10px 32px;
    border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 10pt;
    margin: 4px 8px;
  }
  .pay-online .alt-link { color: #ffb400; font-size: 8.5pt; }

  .included-list { columns: 2; column-gap: 30px; margin: 8px 0 16px; }
  .included-list li {
    font-size: 9pt; padding: 3px 0; break-inside: avoid;
    list-style: none; position: relative; padding-left: 16px;
  }
  .included-list li::before { content: '\\2713'; position: absolute; left: 0; color: #ffb400; font-weight: 700; }

  .terms {
    font-size: 7.5pt; color: #888; margin-top: 16px; padding-top: 10px;
    border-top: 1px solid #e0e0e0; line-height: 1.6;
  }
  .terms strong { color: #666; }

  .footer {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: #111111; color: #ffffff; padding: 14px 40px;
    display: flex; justify-content: space-between; align-items: center; font-size: 8pt;
  }
  .footer a { color: #ffb400; text-decoration: none; }
  .footer .tagline { color: #ffb400; font-style: italic; font-size: 8.5pt; }

  @media print {
    body { background: white; }
    .page { margin: 0; box-shadow: none; }
    .no-print { display: none !important; }
  }
  @media screen {
    body { background: #e0e0e0; padding: 20px; }
    .page { box-shadow: 0 4px 30px rgba(0,0,0,0.15); border-radius: 4px; overflow: hidden; margin-bottom: 20px; }
  }

  .print-bar {
    position: fixed; top: 0; left: 0; right: 0; background: #111;
    padding: 10px 30px; display: flex; align-items: center; justify-content: center;
    gap: 16px; z-index: 999; box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  }
  .print-bar button {
    background: #ffb400; border: none; color: #111; padding: 8px 28px;
    border-radius: 6px; font-family: 'DM Sans', sans-serif; font-size: 11pt; font-weight: 700; cursor: pointer;
  }
  .print-bar button:hover { background: #e5a200; }
  .print-bar span { color: #fff; font-size: 10pt; }
</style>
</head>
<body>

<div class="print-bar no-print">
  <span>Invoice ${invNum} — ${inv.clientName || ''}</span>
  <button onclick="window.print()">Save as PDF / Print</button>
  <button onclick="window.close()" style="background:#333;color:#fff">Close</button>
</div>

<div class="page">
  <!-- HEADER -->
  <div class="header">
    ${logoBase64 ? `<img src="${logoBase64}" alt="Odisea Tours">` : '<div style="color:#fff;font-size:18pt;font-weight:700">ODISEA TOURS</div>'}
    <div class="header-right">
      <div class="inv-num">${invNum}</div>
      <div class="inv-date">${today}</div>
    </div>
  </div>

  <!-- AMBER STRIP -->
  <div class="amber-strip">
    <div class="title">INVOICE</div>
    <div class="status">${isPaid ? 'PAID' : balance < Number(inv.amount) ? 'PARTIALLY PAID' : 'PAYMENT DUE'}</div>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- Info grid -->
    <div class="info-grid">
      <div class="info-block">
        <h4>Bill To</h4>
        <div class="info-row"><span class="label">Organisation</span><span class="value">${inv.clientName || '—'}</span></div>
        ${inv.clientEmail || src.clientEmail ? `<div class="info-row"><span class="label">Email</span><span class="value">${inv.clientEmail || src.clientEmail}</span></div>` : ''}
        ${inv.clientPhone || src.clientPhone ? `<div class="info-row"><span class="label">Phone</span><span class="value">${inv.clientPhone || src.clientPhone}</span></div>` : ''}
      </div>
      <div class="info-block">
        <h4>Invoice Details</h4>
        <div class="info-row"><span class="label">Invoice #</span><span class="value">${invNum}</span></div>
        <div class="info-row"><span class="label">Issue Date</span><span class="value">${fmtDate(inv.createdAt)}</span></div>
        <div class="info-row"><span class="label">Due Date</span><span class="value" style="${!isPaid && isOverdue(inv.dueDate) ? 'color:#ef4444' : ''}">${fmtDate(inv.dueDate)}</span></div>
        ${dest ? `<div class="info-row"><span class="label">Tour</span><span class="value">${inv.tourName || '—'}</span></div>` : ''}
        ${dateRange ? `<div class="info-row"><span class="label">Dates</span><span class="value">${dateRange}</span></div>` : ''}
      </div>
    </div>

    ${dest && (hotelRows || actRows || included.length) ? `
    ${hotelRows ? `
    <div class="section-title">Accommodation</div>
    <table>
      <thead><tr><th>Hotel</th><th>City</th><th>Duration</th><th>Rooms</th><th>Meal Plan</th></tr></thead>
      <tbody>${hotelRows}</tbody>
    </table>` : ''}

    ${actRows ? `
    <div class="section-title">Activities & Excursions</div>
    <table>
      <thead><tr><th>Activity</th><th>Location</th></tr></thead>
      <tbody>${actRows}</tbody>
    </table>` : ''}

    ${included.length ? `
    <div class="section-title">What's Included</div>
    <ul class="included-list">
      ${included.map(item => `<li>${item}</li>`).join('')}
    </ul>` : ''}
    ` : ''}

    <!-- Line Items -->
    <div class="section-title">Invoice Items</div>
    <table>
      <thead><tr><th>Description</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${lineItems.map(li => `<tr>
        <td>${li.desc}</td>
        <td style="text-align:right">${li.unit}</td>
        <td style="text-align:right;font-weight:600">${li.total}</td>
      </tr>`).join('')}</tbody>
    </table>

    <!-- Totals -->
    <div style="display:flex;gap:30px">
      <div style="flex:1">
        ${paymentRows ? `
        <div class="section-title">Payments Received</div>
        <table>
          <thead><tr><th>Date</th><th>Method</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>${paymentRows}</tbody>
        </table>` : ''}
      </div>
      <div class="totals-block" style="flex:0 0 280px">
        <div class="totals-row"><span class="label">Subtotal</span><span class="value">${f(inv.amount)}</span></div>
        ${paid > 0 ? `<div class="totals-row"><span class="label">Paid</span><span class="value" style="color:#22c55e">- ${f(paid)}</span></div>` : ''}
        <div class="totals-row grand">
          <span class="label">${isPaid ? 'PAID IN FULL' : 'BALANCE DUE'}</span>
          <span class="value">${f(balance > 0 ? balance : 0)}</span>
        </div>
      </div>
    </div>

    ${!isPaid ? `
    <!-- Payment Details -->
    <div class="payment-box">
      <h3>How to Pay</h3>
      <div class="bank-grid">
        <div class="bank-col">
          <div class="bank-row"><span class="bl">Account Name</span><span class="bv">Ground Agents Solutions SL</span></div>
          <div class="bank-row"><span class="bl">Bank</span><span class="bv">Banc Sabadell</span></div>
          <div class="bank-row"><span class="bl">IBAN</span><span class="bv">ES37 0081 0241 6700 0177 3985</span></div>
          <div class="bank-row"><span class="bl">BIC / SWIFT</span><span class="bv">BSABESBBXXX</span></div>
          <div class="bank-row"><span class="bl">Bank Address</span><span class="bv">Avenida Oscar Espla 37, 03007, Alicante, Espa\u00f1a</span></div>
        </div>
        <div class="bank-col">
          <div class="bank-row"><span class="bl">Reference</span><span class="bv">${invNum}</span></div>
          <div class="bank-row"><span class="bl">Amount Due</span><span class="bv" style="color:#ffb400;font-size:11pt">${f(balance)}</span></div>
          <div class="bank-row"><span class="bl">Due Date</span><span class="bv">${fmtDate(inv.dueDate)}</span></div>
          <div class="bank-row"><span class="bl">Currency</span><span class="bv">${cur}</span></div>
        </div>
      </div>
      ${(inv.paymentLinkCard || inv.paymentLinkWise) ? `<div class="pay-online">
        <div style="font-size:8.5pt;color:#999;margin-bottom:8px">Or pay securely online:</div>
        ${inv.paymentLinkCard ? `<a href="${inv.paymentLinkCard}">Pay with Card</a>` : ''}
        ${inv.paymentLinkWise ? `<a href="${inv.paymentLinkWise}" style="background:#9fe870;color:#111">Pay with Wise</a>` : ''}
        <div style="margin-top:8px">
          ${inv.paymentLinkCard ? `<span class="alt-link">${inv.paymentLinkCard}</span>` : ''}
          ${inv.paymentLinkCard && inv.paymentLinkWise ? ' &nbsp;|&nbsp; ' : ''}
          ${inv.paymentLinkWise ? `<span class="alt-link">${inv.paymentLinkWise}</span>` : ''}
        </div>
      </div>` : ''}
    </div>` : `
    <div style="text-align:center;padding:20px;background:#f0fdf4;border-radius:8px;border:2px solid #22c55e;margin-top:20px">
      <div style="font-size:14pt;font-weight:700;color:#22c55e">&#10003; PAID IN FULL</div>
      <div style="font-size:9pt;color:#666;margin-top:4px">Thank you for your payment</div>
    </div>`}

    <!-- Terms -->
    <div class="terms">
      <strong>Payment Terms:</strong> Payment is due by the date shown above. Please use the invoice number as your payment reference.
      Late payments may incur additional charges. If you have any questions regarding this invoice, please contact us at
      <strong>juan@odisea-tours.com</strong>.
      <br><br>
      <strong>Cancellation Policy:</strong> Cancellations made more than 8 weeks before departure will receive a full refund minus the deposit.
      Cancellations within 8 weeks of departure are subject to our standard cancellation fees.
      Travel insurance is strongly recommended for all participants.
    </div>

  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>
      <strong>Odisea Tours</strong> &nbsp;|&nbsp; <a href="mailto:juan@odisea-tours.com">juan@odisea-tours.com</a> &nbsp;|&nbsp; Travel Specialists
    </div>
    <div class="tagline">Your adventure starts here</div>
  </div>
</div>

</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) { alert('Pop-up blocked. Please allow pop-ups for this page.'); return; }
    w.document.write(html);
    w.document.close();
  }
};
