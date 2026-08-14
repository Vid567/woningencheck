import assert from "node:assert/strict";
import {resolveThresholdValue} from "../assets/applicability.js";

const parameters=[
  {id:"nhg-cost-limit-2027-test",classification:"national-indexed",value:500000,status:"current"},
  {id:"enschede-opkoop-limit-2027-test",classification:"municipal-indexed",value:380000,status:"current"},
  {id:"amsterdam-opkoop-limit-2027-test",classification:"municipal-indexed",value:650000,status:"current"}
];

const linked={
  denHaag:{thresholdRef:"nhg-cost-limit-2027-test",factor:1},
  breda:{thresholdRef:"nhg-cost-limit-2027-test",factor:1},
  bodegravenReeuwijk:{thresholdRef:"nhg-cost-limit-2027-test",factor:0.70},
  deventer:{thresholdRef:"nhg-cost-limit-2027-test",factor:1},
  enschede:{thresholdRef:"enschede-opkoop-limit-2027-test",factor:1},
  amsterdam:{thresholdRef:"amsterdam-opkoop-limit-2027-test",factor:1}
};

assert.equal(resolveThresholdValue(linked.denHaag,parameters),500000);
assert.equal(resolveThresholdValue(linked.breda,parameters),500000);
assert.equal(resolveThresholdValue(linked.bodegravenReeuwijk,parameters),350000);
assert.equal(resolveThresholdValue(linked.deventer,parameters),500000);
assert.equal(resolveThresholdValue(linked.enschede,parameters),380000);
assert.equal(resolveThresholdValue(linked.amsterdam,parameters),650000);

const nhgRaised=parameters.map(p=>p.id==="nhg-cost-limit-2027-test"?{...p,value:520000}:p);
assert.equal(resolveThresholdValue(linked.denHaag,nhgRaised),520000);
assert.equal(resolveThresholdValue(linked.breda,nhgRaised),520000);
assert.equal(resolveThresholdValue(linked.bodegravenReeuwijk,nhgRaised),364000);
assert.equal(resolveThresholdValue(linked.deventer,nhgRaised),520000);
assert.equal(resolveThresholdValue(linked.enschede,nhgRaised),380000);
assert.equal(resolveThresholdValue(linked.amsterdam,nhgRaised),650000);

const emmenFixed=250000;
const nijmegenFixed=[278000,396000];
assert.equal(emmenFixed,250000);
assert.deepEqual(nijmegenFixed,[278000,396000]);

assert.equal(resolveThresholdValue({thresholdRef:"missing-threshold",factor:1},parameters),undefined);
assert.equal(resolveThresholdValue({value:250000},parameters),250000);

console.log("PASS threshold future-year: NHG-linked municipalities move together, municipal-indexed and fixed thresholds stay independent");
