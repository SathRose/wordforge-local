(function(){
 const api=window.__WFAPI,db=api.getDB();
 if(!db.prog.accent)throw new Error('Backup progress not restored');
 if(Object.keys(db.custom).length!==12)throw new Error('Custom books missing after restore');
 return {backupRestored:true,customCount:Object.keys(db.custom).length,accentProgress:db.prog.accent,sortCount:db.bookPickerOrder.length};
})();
