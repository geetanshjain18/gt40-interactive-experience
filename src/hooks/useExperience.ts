import { useEffect, useReducer } from 'react'
export type Phase = 'loading' | 'ready' | 'preparing' | 'igniting' | 'exploring' | 'error'
export interface ExperienceState { phase: Phase; geometryReady: boolean; canvasReady: boolean; modelReady: boolean; reduced: boolean; attempt: number; error: string; requested: boolean }
type Action = { type: 'GEOMETRY' | 'CANVAS_READY' | 'MODEL_READY' | 'REQUEST' | 'START' | 'COMPLETE' | 'RESET' } | { type: 'MODEL_ERROR' | 'WEBGL_ERROR'; message: string } | { type: 'MOTION'; reduced: boolean }
const initial = (): ExperienceState => ({phase:'loading',geometryReady:false,canvasReady:false,modelReady:false,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,attempt:0,error:'',requested:false})
function reducer(s: ExperienceState, a: Action): ExperienceState {
 switch(a.type) {
 case 'GEOMETRY': return {...s,geometryReady:true}
 case 'CANVAS_READY': return {...s,canvasReady:true,error:'',phase:s.phase==='igniting'||s.phase==='exploring'?s.phase:s.modelReady?(s.requested?'preparing':'ready'):'loading'}
 case 'MODEL_READY': return {...s,modelReady:true,error:'',phase:s.phase==='igniting'||s.phase==='exploring'?s.phase:s.requested?'preparing':'ready'}
 case 'REQUEST': return s.requested?s:{...s,requested:true,phase:'preparing'}
 case 'START': return {...s,phase:'igniting'}
 case 'COMPLETE': return {...s,phase:'exploring'}
 case 'MODEL_ERROR': return {...s,phase:'error',error:a.message}
 case 'WEBGL_ERROR': return {...s,phase:'error',error:a.message}
 case 'MOTION': return {...s,reduced:a.reduced}
 case 'RESET': return {...initial(),attempt:s.attempt+1}
 }
}
export function useExperience() {
 const [state,dispatch]=useReducer(reducer,undefined,initial)
 useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)'),fn=(e:MediaQueryListEvent)=>dispatch({type:'MOTION',reduced:e.matches});m.addEventListener('change',fn);return()=>m.removeEventListener('change',fn)},[])
 useEffect(()=>{document.body.style.overflowY=state.phase==='exploring'||state.phase==='error'?'auto':'hidden';return()=>{document.body.style.overflowY=''}},[state.phase])
 return {state,dispatch}
}
