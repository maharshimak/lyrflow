# Architecture and implemented scope

Next.js frontend and proxy routes -> Flask job/SSE API -> lyrics fetch/cache -> cleaning, language detection, romanization, AI/fallback translation -> validated vocal/practice analytics.

Language-specific romanization, retry/fallback processing, chunk progress, multilingual lyric records, confidence/emotion/difficulty/phoneme analytics and practice reports.

## Modules inspected

- `ai_processor.py`: _chunk_cache_path, _fallback_objects, _call_openai_with_retry, _parse_ai_response, _process_chunk, process_lines_with_ai, _is_symbol_or_filler_only.
- `analyzer.py`: analyze_song, _practice_score.
- `cleaner.py`: clean_raw_lyrics.
- `config.py`: require_api_keys.
- `demo.py`: _ensure_utf8_output, run_demo.
- `detector.py`: detect_line_language.
- `fetcher.py`: _cache_dir, _cache_path, _clean_genius_lyrics, fetch_lyrics.
- `legacy_output_formatter.py`: _collapse_spaces, _normalize_translation, _emotion_from_token, _parse_emotion_and_difficulty, _detect_language, _split_combo, _practice_priority, parse_legacy_output, _main.
- `main.py`: slugify, save_song, main.
- `pipeline.py`: _update_progress, _collapse_spaces, _cleanup_romanized_japanese, _cleanup_translation_english, _cleanup_translation_french, process_song, _pick_group_key.
- `reporter.py`: generate_report.
- `romanizer.py`: romanize_korean, romanize_japanese, romanize_line.
- `schema.py`: compute_difficulty_score, detect_emotion, compute_practice_priority, _compute_vocal_arc, _compute_breath_coach, dominant_language, validate_line_object.
- `syllables.py`: syllables_korean_from_hangul, syllables_japanese, syllables_for_line.
- `translator.py`: _is_symbol_or_filler_line, translate_line.
- `web_server.py`: _set_job, _run_job, _add_cors, after_request, handle_options, index, ui_static, api_song_list, api_process_song, api_job, api_job_stream, generate.
- `__init__.py`: source/module definitions inspected.
- `tests/test_ai_processor.py`: _make_valid_array, test_parse_valid_array, test_parse_wrapped_object, test_parse_length_mismatch_recovery, test_parse_invalid_json_fallback, test_no_openai_key_uses_fallback, test_fallback_objects_are_safe.
- `tests/test_detector.py`: test_pure_korean, test_mixed_japanese, test_mixed_korean, test_english, test_symbol_only.
- `tests/test_pipeline.py`: test_pipeline_full_schema.
- `tests/test_romanizer.py`: test_korean_basic, test_mixed_korean_preserves_latin, test_mixed_japanese_preserves_latin, test_english_unchanged.
- `tests/test_translator_fallback.py`: test_translation_fallback, test_ai_fallback_objects.
- `tests/__init__.py`: source/module definitions inspected.
- `resources/extract_ppt_text.py`: main.
- `frontend/next-env.d.ts`: source/module definitions inspected.
- `frontend/next.config.js`: source/module definitions inspected.
- `frontend/postcss.config.js`: source/module definitions inspected.
- `frontend/tailwind.config.ts`: source/module definitions inspected.
- `frontend/lib/api.ts`: looksLikeFlaskBase, fetchTextFromAnyBase, fetchSongList, submitProcessSong, fetchJob.
- `frontend/lib/types.ts`: source/module definitions inspected.
- `frontend/components/hero.tsx`: Hero, onCardMove, x, y, onCardLeave.
- `frontend/components/loading-state.tsx`: LoadingState.
- `frontend/components/lyric-card.tsx`: LyricCard.
- `frontend/components/lyric-list.tsx`: LyricList.
- `frontend/components/song-input.tsx`: detectLangFlag, loadRecent, saveRecent, SongInput, pickSuggestion, handleQueryKey, analyze.
- `frontend/components/ui/ai-loader.tsx`: AiLoader.
- `frontend/components/ui/badge.tsx`: Badge.
- `frontend/components/ui/button.tsx`: Button.
- `frontend/components/ui/card.tsx`: Card.
- `frontend/components/ui/cn.ts`: cn.
- `frontend/components/ui/input.tsx`: Input.
- `frontend/components/ui/lyric-card.tsx`: formatDifficulty, LyricCard, displayText.
- `frontend/components/ui/music-portfolio-immersive.tsx`: TimeDisplay, updateTime, MusicPortfolioImmersive.
- `frontend/components/ui/music-portfolio.tsx`: TimeDisplay, tick, ExpandedRow, LyricRow, MusicPortfolio, songTitle, songArtist.
- `frontend/components/ui/progress.tsx`: Progress.
- `frontend/components/ui/select.tsx`: Select.
- `frontend/components/ui/tooltip.tsx`: TooltipContent.
- `frontend/app/error.tsx`: ErrorPage.
- `frontend/app/global-error.tsx`: GlobalError.
- `frontend/app/layout.tsx`: RootLayout.
- `frontend/app/not-found.tsx`: NotFound.
- `frontend/app/page.tsx`: Page, scrollToAnalyze.
- `frontend/app/demo/page.tsx`: DemoPage, run.
- `frontend/app/api/song-list/route.ts`: base, GET.
- `frontend/app/api/process-song/route.ts`: base, POST.
- `frontend/app/api/job/[job_id]/route.ts`: base, GET.

## Request routes

| Source | Method | Path | Handler |
|---|---|---|---|
| `web_server.py` | get | `/` | `index` |
| `web_server.py` | get | `/ui/<path:path>` | `ui_static` |
| `web_server.py` | get | `/api/song-list` | `api_song_list` |
| `web_server.py` | post | `/api/process-song` | `api_process_song` |
| `web_server.py` | get | `/api/job/<job_id>` | `api_job` |
| `web_server.py` | get | `/api/job/<job_id>/stream` | `api_job_stream` |

Static parsing found the modules/handlers above without importing/executing them. Fixtures, enums and abstract declarations are not proof that every flow is complete. See TECHNICAL_ISSUES.md for incomplete adapters and inconsistent pipeline contracts.
