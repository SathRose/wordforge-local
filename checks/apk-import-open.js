(function(){
  const api=window.__WFAPI;
  delete api.getDB().prog.accent;
  window.__wfFlushSave();
  api.go('settings');
  document.getElementById('setImport').click();
  return {importClicked:true,progressBeforeImport:!!api.getDB().prog.accent};
})();
