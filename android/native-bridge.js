/* Runs before the bundled app. No changes are made to the desktop HTML. */
(function () {
  'use strict';
  var native = window.WordForgeNative;
  if (!native) return;
  window.SpeechSynthesisUtterance = function (text) { this.text = String(text || ''); this.lang = 'en-US'; this.rate = 1; };
  var synth = {
    getVoices: function () {
      return native.ttsAvailable() ? [
        { name: 'Android English (US)', lang: 'en-US', localService: true },
        { name: 'Android English (UK)', lang: 'en-GB', localService: true }
      ] : [];
    },
    speak: function (u) { native.ttsSpeak(String(u.text || ''), String(u.lang || 'en-US'), Number(u.rate) || 1); },
    cancel: function () { native.ttsStop(); },
    onvoiceschanged: null
  };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
})();
