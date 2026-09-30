/**
 * VoiceService — Browser-native Speech Recognition + TTS
 * Primary: Web Speech API (works in Chrome/Edge with no API key)
 * Optional: Google Cloud TTS (if VITE_GOOGLE_CHIRP3_API_KEY is set)
 */

const GOOGLE_TTS_KEY = (import.meta as any).env?.VITE_GOOGLE_CHIRP3_API_KEY || '';
const HAS_GOOGLE_TTS = GOOGLE_TTS_KEY && GOOGLE_TTS_KEY !== 'placeholder';

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  language: string;
  langCode: string; // BCP-47 e.g. hi-IN
  accent: string;
  description: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  { id: 'hi-f',  name: 'Priya',  gender: 'female', language: 'Hindi',   langCode: 'hi-IN', accent: 'Hindi',          description: 'हिंदी महिला आवाज़' },
  { id: 'hi-m',  name: 'Arjun',  gender: 'male',   language: 'Hindi',   langCode: 'hi-IN', accent: 'Hindi',          description: 'हिंदी पुरुष आवाज़' },
  { id: 'en-f',  name: 'Sarah',  gender: 'female', language: 'English', langCode: 'en-IN', accent: 'Indian English', description: 'Indian English female' },
  { id: 'en-m',  name: 'Raj',    gender: 'male',   language: 'English', langCode: 'en-IN', accent: 'Indian English', description: 'Indian English male' },
  { id: 'mr-f',  name: 'Ananya', gender: 'female', language: 'Marathi', langCode: 'mr-IN', accent: 'Marathi',        description: 'मराठी महिला आवाज' },
  { id: 'ta-f',  name: 'Kavya',  gender: 'female', language: 'Tamil',   langCode: 'ta-IN', accent: 'Tamil',          description: 'தமிழ் பெண் குரல்' },
  { id: 'te-m',  name: 'Vikram', gender: 'male',   language: 'Telugu',  langCode: 'te-IN', accent: 'Telugu',         description: 'తెలుగు పురుష స్వరం' },
  { id: 'kn-f',  name: 'Deepa',  gender: 'female', language: 'Kannada', langCode: 'kn-IN', accent: 'Kannada',        description: 'ಕನ್ನಡ ಮಹಿಳಾ ಧ್ವನಿ' },
  { id: 'pa-m',  name: 'Gurpreet', gender: 'male', language: 'Punjabi', langCode: 'pa-IN', accent: 'Punjabi',        description: 'ਪੰਜਾਬੀ ਮਰਦ ਆਵਾਜ਼' },
];

// Short-code → BCP-47
const LANG_MAP: Record<string, string> = {
  hi: 'hi-IN', en: 'en-IN', mr: 'mr-IN',
  ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', pa: 'pa-IN',
};

class VoiceService {
  private synth = window.speechSynthesis;
  private recognition: any = null;
  private recognizing = false;
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      this.recognition = new SR();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
    }
  }

  isSpeechRecognitionSupported() { return !!this.recognition; }

  // ── SPEAK ──────────────────────────────────────────────────────────────────
  async speak(text: string, langShort = 'hi'): Promise<void> {
    this.stop();
    const bcp47 = LANG_MAP[langShort] || 'hi-IN';

    if (HAS_GOOGLE_TTS) {
      try {
        await this._googleTTS(text, bcp47);
        return;
      } catch (e) {
        console.warn('Google TTS failed, falling back to Web Speech API', e);
      }
    }
    return this._webSpeech(text, bcp47);
  }

  private _webSpeech(text: string, bcp47: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = bcp47;
      utt.rate = 0.9;
      utt.volume = 1;
      utt.pitch = 1;

      // Try to pick a matching voice
      const voices = this.synth.getVoices();
      const match =
        voices.find(v => v.lang === bcp47) ||
        voices.find(v => v.lang.startsWith(bcp47.split('-')[0]));
      if (match) utt.voice = match;

      utt.onend = () => resolve();
      utt.onerror = (e) => {
        // 'interrupted' is not a real error — it just means stop() was called
        if ((e as any).error === 'interrupted') { resolve(); return; }
        reject(e);
      };
      this.synth.speak(utt);
    });
  }

  private async _googleTTS(text: string, bcp47: string): Promise<void> {
    const gender = 'FEMALE';
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: bcp47, ssmlGender: gender },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9 },
        }),
      }
    );
    if (!res.ok) throw new Error(`Google TTS ${res.status}`);
    const { audioContent } = await res.json();
    return new Promise((resolve, reject) => {
      const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
      this.currentAudio = audio;
      audio.onended = () => { this.currentAudio = null; resolve(); };
      audio.onerror = (e) => { this.currentAudio = null; reject(e); };
      audio.play().catch(reject);
    });
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (this.synth.speaking) this.synth.cancel();
  }

  isSpeaking() {
    return this.synth.speaking || (!!this.currentAudio && !this.currentAudio.paused);
  }

  // ── LISTEN ─────────────────────────────────────────────────────────────────
  startListening(langShort = 'hi'): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported in this browser. Use Chrome or Edge.'));
        return;
      }
      if (this.recognizing) {
        reject(new Error('Already listening'));
        return;
      }

      this.recognition.lang = LANG_MAP[langShort] || 'hi-IN';
      this.recognizing = true;

      this.recognition.onresult = (e: any) => {
        this.recognizing = false;
        resolve(e.results[0][0].transcript);
      };
      this.recognition.onerror = (e: any) => {
        this.recognizing = false;
        reject(new Error(e.error === 'not-allowed'
          ? 'Microphone permission denied. Please allow microphone access.'
          : e.error));
      };
      this.recognition.onend = () => { this.recognizing = false; };

      try { this.recognition.start(); }
      catch (e) { this.recognizing = false; reject(e); }
    });
  }

  stopListening() {
    if (this.recognition && this.recognizing) {
      this.recognition.stop();
      this.recognizing = false;
    }
  }

  isListeningActive() { return this.recognizing; }
}

export const voiceService = new VoiceService();
