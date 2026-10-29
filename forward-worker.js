/* Same offline kernels as the main-thread fallback. */
importScripts('forward-physics.js');
onmessage=async e=>{try{const result=await ForwardPhysics.compute(e.data,p=>postMessage({progress:p}));postMessage({result});}catch(e){postMessage({error:e.message});}};
