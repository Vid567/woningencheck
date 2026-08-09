import json
import warnings
from pathlib import Path
warnings.filterwarnings("ignore", category=DeprecationWarning)
from jsonschema import Draft202012Validator, RefResolver

root=Path(__file__).resolve().parents[1]
schemas={path.name:json.loads(path.read_text(encoding="utf-8")) for path in (root/"schemas").glob("*.json")}
store={schema.get("$id",name):schema for name,schema in schemas.items()}

def validate(schema_name, values):
    schema=schemas[schema_name]
    validator=Draft202012Validator(schema,resolver=RefResolver.from_schema(schema,store=store))
    errors=[]
    for index,value in enumerate(values):
        errors.extend(f"{schema_name}[{index}] {error.message}" for error in validator.iter_errors(value))
    if errors: raise SystemExit("\n".join(errors))

validate("regulation.schema.json",json.loads((root/"data/regulations.json").read_text(encoding="utf-8"))["records"])
validate("research-status.schema.json",json.loads((root/"data/research-status.json").read_text(encoding="utf-8"))["records"])
validate("review-item.schema.json",json.loads((root/"data/review-queue.json").read_text(encoding="utf-8"))["items"])
print("PASS JSON Schema validation")
