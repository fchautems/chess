export type GameSound =
  | 'move'
  | 'correct'
  | 'mistake'
  | 'opponent'
  | 'hint'
  | 'reward'
  | 'combo'
  | 'boss'

type AudioContextConstructor = typeof AudioContext

export class AudioService {
  private context: AudioContext | null = null
  private enabled = true

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  play(sound: GameSound): void {
    if (!this.enabled) return
    const context = this.getContext()
    if (!context) return
    void context.resume()

    const now = context.currentTime + 0.01
    switch (sound) {
      case 'move':
        this.woodClick(context, now, 130, 0.055)
        break
      case 'opponent':
        this.woodClick(context, now, 105, 0.075)
        break
      case 'correct':
        this.tone(context, now, 392, 0.09, 0.045)
        this.tone(context, now + 0.07, 523.25, 0.16, 0.035)
        break
      case 'mistake':
        this.tone(context, now, 164.8, 0.13, 0.055, 'triangle', 116)
        break
      case 'hint':
        this.tone(context, now, 659.25, 0.12, 0.025, 'sine')
        this.tone(context, now + 0.09, 783.99, 0.18, 0.02, 'sine')
        break
      case 'reward':
        this.tone(context, now, 523.25, 0.09, 0.025)
        this.tone(context, now + 0.06, 659.25, 0.09, 0.025)
        this.tone(context, now + 0.12, 783.99, 0.2, 0.03)
        break
      case 'combo':
        this.tone(context, now, 440, 0.08, 0.03)
        this.tone(context, now + 0.05, 554.37, 0.08, 0.03)
        this.tone(context, now + 0.1, 659.25, 0.2, 0.035)
        break
      case 'boss':
        this.tone(context, now, 110, 0.35, 0.06, 'sawtooth', 82)
        this.tone(context, now + 0.13, 164.8, 0.4, 0.035, 'triangle')
        break
    }
  }

  private getContext(): AudioContext | null {
    if (this.context) return this.context
    const constructor = (
      window as typeof window & { webkitAudioContext?: AudioContextConstructor }
    ).AudioContext ??
      (window as typeof window & { webkitAudioContext?: AudioContextConstructor })
        .webkitAudioContext
    if (!constructor) return null
    this.context = new constructor()
    return this.context
  }

  private woodClick(
    context: AudioContext,
    at: number,
    frequency: number,
    duration: number,
  ): void {
    const oscillator = context.createOscillator()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(frequency, at)
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.55, at + duration)
    filter.type = 'lowpass'
    filter.frequency.value = 720
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.065, at + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    oscillator.connect(filter).connect(gain).connect(context.destination)
    oscillator.start(at)
    oscillator.stop(at + duration + 0.01)
  }

  private tone(
    context: AudioContext,
    at: number,
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
    endFrequency = frequency,
  ): void {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, at)
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + duration)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(at)
    oscillator.stop(at + duration + 0.02)
  }
}
