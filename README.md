# Lyrflow

Status: **PUBLIC SOURCE / REVIEW PENDING — NOT PRODUCTION READY**. This repository is currently publicly visible, although the earlier publication plan required private-first security and source-rights review. Public availability does not establish licensing clearance, security approval, or readiness to deploy. Do not use real credentials, personal data, or production services until reviewed.

Next.js frontend and proxy routes -> Flask job/SSE API -> lyrics fetch/cache -> cleaning, language detection, romanization, AI/fallback translation -> validated vocal/practice analytics.

Implemented source scope: Language-specific romanization, retry/fallback processing, chunk progress, multilingual lyric records, confidence/emotion/difficulty/phoneme analytics and practice reports.

The original source was not modified. Secrets, existing databases, media, model weights, binary tools, personal outputs and dependency/generated directories are absent. Credentials are blank in `.env.example`; obtain operator values privately only after the next execution step is approved. Code source rights/licensing remain to be confirmed; no license was fabricated.

Available publication documentation: [SETUP.md](SETUP.md), [ARCHITECTURE.md](ARCHITECTURE.md), and [PUBLICATION_NOTES.md](PUBLICATION_NOTES.md). Earlier references to security/readiness review reports and source manifests are not present in this repository and must not be represented as published evidence. The draft CI workflow verifies specific automated tests; it does not establish production readiness or real-provider integration.

Entry point: `lyrflow/web_server.py`. Frontend source: `frontend`. Proposed name: `lyrflow`. Earlier intended visibility: **private until security, ownership/license and verification clearance**. Current visibility: **public**. The accompanying PR does not change repository visibility.
