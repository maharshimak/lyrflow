"""
reporter.py — Human-readable practice report for demo presentation.
"""

from __future__ import annotations


def generate_report(song: dict) -> str:
    sep = "=" * 62
    lines: list[str] = [
        sep,
        "  LYRFLOW PRACTICE REPORT",
        f"  {song.get('title','?')} — {song.get('artist','?')}",
        sep,
        f"  Language         {str(song.get('language','?')).upper()}",
        f"  Total Lines      {song.get('total_lines','?')}",
        f"  Avg Difficulty   {song.get('avg_difficulty','?')}/100",
        f"  Singability      {song.get('singability_score','?')}/100",
        f"  Dominant Emotion {song.get('dominant_emotion','?')}",
        f"  Repetition Focus {song.get('repeated_lines_count', 0)} lines",
        "",
        "  TOP LINES TO PRACTICE:",
    ]

    for i, line in enumerate(song.get("high_priority_lines", [])[:5], 1):
        lines.append(f"    {i}. {line}")

    lines += ["", "  EMOTION BREAKDOWN:"]
    for emotion, count in sorted(
        song.get("emotion_distribution", {}).items(),
        key=lambda x: -x[1],
    ):
        bar = "█" * min(int(count), 30)
        lines.append(f"    {emotion:<14} {bar} ({count})")

    hardest = song.get("hardest_line", {})
    if hardest:
        lines += [
            "",
            "  HARDEST LINE:",
            f"    {hardest.get('line','')}",
            f"    → {hardest.get('romanized','')}",
            f"    💡 {hardest.get('phoneme_hints','N/A')}",
        ]

    lines.append(sep)
    return "\n".join(lines)

