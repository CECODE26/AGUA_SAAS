#!/bin/sh
# Activa los hooks del repo (revisión de secretos antes de cada commit)
git config core.hooksPath .githooks && echo "Hooks activados: cada commit se revisa con gitleaks."
