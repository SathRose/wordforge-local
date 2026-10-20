(function(){
  const close=document.getElementById('mClose');if(close)close.click();
  window.__WFAPI.go('settings');
  document.getElementById('setExport').click();
  return {exportClicked:true};
})();
