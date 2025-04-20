Yes, using multiple OffscreenCanvas instances with different worker threads effectively spreads CPU usage across multiple cores. This is parallel CPU processing, not GPU acceleration, but it can still significantly improve performance:

```javascript
// Main thread
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;

// Create separate workers for different visualizations
const spectrogramWorker = new Worker('spectrogram-worker.js');
const waveformWorker = new Worker('waveform-worker.js');

// Transfer canvases to respective workers
spectrogramWorker.postMessage({
  canvas: document.getElementById('spectrogramCanvas').transferControlToOffscreen(),
  action: 'init'
}, [document.getElementById('spectrogramCanvas').transferControlToOffscreen()]);

waveformWorker.postMessage({
  canvas: document.getElementById('waveformCanvas').transferControlToOffscreen(),
  action: 'init'
}, [document.getElementById('waveformCanvas').transferControlToOffscreen()]);

// Send audio data to both workers
function updateVisualizations() {
  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  const timeData = new Uint8Array(analyser.fftSize);
  
  analyser.getByteFrequencyData(frequencyData);
  analyser.getByteTimeDomainData(timeData);
  
  spectrogramWorker.postMessage({action: 'update', data: frequencyData});
  waveformWorker.postMessage({action: 'update', data: timeData});
  
  requestAnimationFrame(updateVisualizations);
}
```

This approach provides:
1. Parallel computation across CPU cores
2. Independent rendering threads for each visualization
3. Better overall CPU utilization
4. Main thread remains responsive for user interactions

It still won't match the performance of true GPU acceleration with WebGL/WebGPU, but it can provide meaningful speedups for CPU-bound visualizations.