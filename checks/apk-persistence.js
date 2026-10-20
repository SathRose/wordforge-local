(function(){
  const db=window.__WFAPI.getDB();
  if(!db.prog.accent||db.custom.vocabgo_cet4_2_list_10.words.length!==30||db.bookPickerOrder.length!==40)throw new Error('State did not persist across process restart');
  window.__WFAPI.go('study');window.__WFAPI.showBookPicker();
  return {progressAfterProcessRestart:true,sourceBooksPreserved:true,sortPreferencePreserved:true,firstBook:document.querySelector('#modal [data-book]').dataset.book,networkOnline:navigator.onLine};
})();
