import {VESSEL_ID} from './world.mjs';
/** Standalone preparation only. Never receives a CORE hook or local restore capability. */
export function createGameHost(controller,view){
  let saved=null,prepared=false;
  return {
    readLocal:()=>controller.sample(),
    prepareLocal(context){
      if(context.signal.aborted||context.vesselId!==VESSEL_ID)return false;
      saved??=controller.save();
      try{controller.place(context.pose);prepared=true;return true;}catch{return false;}
    },
    exitLocal(){if(saved){controller.restore(saved);saved=null;}prepared=false;view.clearInput?.();},
    renderRemote:peer=>view.renderRemote(peer),removeRemote:id=>view.removeRemote(id),
    networkStatus:state=>view.networkStatus?.(state),get prepared(){return prepared;}
  };
}
