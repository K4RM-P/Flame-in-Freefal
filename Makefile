PY := physics/.venv/bin/python
export PYTHONPATH := $(CURDIR)/physics

.PHONY: venv data fit validate vectors export test all

venv:
	cd physics && uv venv -p 3.11 .venv && uv pip install --python .venv/bin/python -e ".[pipeline,dev]"

data:
	$(PY) physics/pipeline/fetch.py
	$(PY) physics/pipeline/fetch_psi.py
	$(PY) physics/pipeline/ingest_psi.py
	$(PY) physics/pipeline/extract_tables.py
	$(PY) physics/pipeline/build.py

fit:
	$(PY) physics/fit/fit_droplet.py
	$(PY) physics/fit/fit_suppression.py

validate:
	$(PY) physics/validate/run_all.py

vectors:
	$(PY) physics/validate/golden_vectors.py

export:
	$(PY) physics/validate/export.py

test:
	cd physics && .venv/bin/python -m pytest -q

all: data fit validate vectors export test
