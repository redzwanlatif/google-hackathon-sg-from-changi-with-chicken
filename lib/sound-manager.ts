// Sound Manager for Comic Book Effects
// Handles all game sound effects with preloading and volume control

export type SoundEffect =
  | 'whoosh'
  | 'chicken-cluck'
  | 'chicken-angry'
  | 'ding'
  | 'sad-trombone'
  | 'phone-ring'
  | 'door-slam';

const SOUND_PATHS: Record<SoundEffect, string> = {
  'whoosh': '/assets/sound_effects/whoosh-sfx.mp3',
  'chicken-cluck': '/assets/sound_effects/chicken-clucks-lovingly.mp3',
  'chicken-angry': '/assets/sound_effects/chicken_4Iiw4qR.mp3',
  'ding': '/assets/sound_effects/ding-sound-effect_2.mp3',
  'sad-trombone': '/assets/sound_effects/sadtrombone.swf.mp3',
  'phone-ring': '/assets/sound_effects/fnaf-phone-ringing-sound.mp3',
  'door-slam': '/assets/sound_effects/door-slamming-sound-effect-no-repeats-or-silence-2016.mp3',
};

class SoundManager {
  private sounds: Map<SoundEffect, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    if (typeof window !== 'undefined') {
      this.preloadSounds();
    }
  }

  private preloadSounds() {
    Object.entries(SOUND_PATHS).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.volume = this.volume;
      this.sounds.set(key as SoundEffect, audio);
    });
  }

  play(effect: SoundEffect, volumeOverride?: number) {
    if (!this.enabled) return;

    const sound = this.sounds.get(effect);
    if (sound) {
      // Clone the audio to allow overlapping plays
      const clone = sound.cloneNode() as HTMLAudioElement;
      clone.volume = volumeOverride ?? this.volume;
      clone.play().catch(() => {
        // Ignore autoplay restrictions
      });
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      sound.volume = this.volume;
    });
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  // Play whoosh with slight pitch variation for variety
  playWhoosh() {
    this.play('whoosh', this.volume * (0.8 + Math.random() * 0.4));
  }

  // Play chicken sound based on mood
  playChickenSound(mood: number) {
    if (mood >= 50) {
      this.play('chicken-cluck');
    } else {
      this.play('chicken-angry');
    }
  }

  // Play success ding
  playSuccess() {
    this.play('ding');
  }

  // Play failure sound
  playFailure() {
    this.play('sad-trombone');
  }
}

// Singleton instance
export const soundManager = new SoundManager();

// Hook for React components
export function useSoundEffect() {
  return {
    play: (effect: SoundEffect) => soundManager.play(effect),
    playWhoosh: () => soundManager.playWhoosh(),
    playChicken: (mood: number) => soundManager.playChickenSound(mood),
    playSuccess: () => soundManager.playSuccess(),
    playFailure: () => soundManager.playFailure(),
    setVolume: (v: number) => soundManager.setVolume(v),
    setEnabled: (e: boolean) => soundManager.setEnabled(e),
  };
}
