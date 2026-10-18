import{c as r,f as a}from"./index-BP0BU0n7.js";/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o=r("AlertTriangle",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z",key:"c3ski4"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]),i={listarTurnos:async()=>(await a.get("/api/sesion/turnos")).data,obtenerRango:async s=>(await a.get(`/api/sesion/rango/${s}`)).data,validarPersona:async s=>(await a.get(`/api/sesion/validar-persona/${s}`)).data,abrirSesion:async s=>(await a.post("/api/sesion/apertura",s)).data,cerrarSesion:async(s,e)=>(await a.post(`/api/sesion/cerrar/${s}`,{razon:e??null})).data,liberarPunto:async(s,e)=>(await a.post("/api/sesion/liberar-punto",{sesion_id:s,razon:e})).data,listarActivasAdmin:async()=>(await a.get("/api/sesion/activas-admin")).data};export{o as A,i as s};
