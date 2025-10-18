export function playChime() {
  if (typeof window === "undefined") return;
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return;

  const audioCtx = new AudioContextClass();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  if (audioCtx.state === "suspended") {
    void audioCtx.resume().catch(() => undefined);
  }

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
  const attackStart = audioCtx.currentTime;
  gainNode.gain.setValueAtTime(0, attackStart);
  gainNode.gain.linearRampToValueAtTime(0.2, attackStart + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, attackStart + 0.7);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const startTime = audioCtx.currentTime + 0.05;

  oscillator.start(startTime);
  oscillator.stop(startTime + 0.6);
  oscillator.addEventListener("ended", () => {
    audioCtx.close().catch(() => {
      // AudioContext might already be closed; ignore to keep UX smooth.
    });
  });
}
