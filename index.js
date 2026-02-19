console.log('Worker is running... ' + new Date());
setInterval(() => {
    console.log('Worker heartbeat: ' + new Date());
}, 60000);
