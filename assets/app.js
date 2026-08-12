import {buildAddressContext,evaluateRule,isApplicationRouteRelevant,STATES} from "./applicability.js?v=20260809-geography";
"use strict";
const state={municipalities:[],regulations:[],sourceConfidence:{},locationRules:[],sourceAuditVerified:"",context:null,answers:{},goal:"",address:null};const el=id=>document.getElementById(id);const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"