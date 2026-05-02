from app.services.rag_pipeline import build_history_blocks, prepare_retrieved_chunks


def test_prepare_retrieved_chunks_filters_duplicates_and_low_scores() -> None:
    result = {
        "documents": [[
            "Pydantic validates request and response data.",
            "Pydantic validates request and response data.",
            "Completely unrelated low score chunk.",
        ]],
        "metadatas": [[
            {
                "source_name": "Doc A",
                "document_title": "A.pdf",
                "source_id": "source-a",
                "document_id": "doc-a",
                "chunk_index": 0,
            },
            {
                "source_name": "Doc A",
                "document_title": "A.pdf",
                "source_id": "source-a",
                "document_id": "doc-a",
                "chunk_index": 1,
            },
            {
                "source_name": "Doc B",
                "document_title": "B.pdf",
                "source_id": "source-b",
                "document_id": "doc-b",
                "chunk_index": 0,
            },
        ]],
        "distances": [[0.1, 0.11, 9.0]],
    }

    chunks = prepare_retrieved_chunks(result)
    assert len(chunks) == 1
    assert chunks[0].source_name == "Doc A"


def test_prepare_retrieved_chunks_prefers_lexical_match_for_specific_queries() -> None:
    result = {
        "documents": [[
            "300 beginner-friendly Apache Spark questions for practice.",
            "Kosmagambetova Muslima final score 24.5 in group 21P.",
            "Nazik Altynai final score 23.5 in group 21P.",
        ]],
        "metadatas": [[
            {
                "source_name": "Spark Questions",
                "document_title": "Spark_300_Easy_Questions.pdf",
                "source_id": "source-spark",
                "document_id": "doc-spark",
                "chunk_index": 0,
            },
            {
                "source_name": "Inf 395 practice grades",
                "document_title": "Inf 395 practice grades - grades.pdf",
                "source_id": "source-grades",
                "document_id": "doc-grades",
                "chunk_index": 4,
            },
            {
                "source_name": "Inf 395 practice grades",
                "document_title": "Inf 395 practice grades - grades.pdf",
                "source_id": "source-grades",
                "document_id": "doc-grades",
                "chunk_index": 5,
            },
        ]],
        "distances": [[0.05, 0.2, 0.25]],
    }

    chunks = prepare_retrieved_chunks(result, query="scores for Muslima")
    assert chunks[0].source_name == "Inf 395 practice grades"
    assert "Muslima" in chunks[0].full_text
    assert all(chunk.source_name != "Spark Questions" for chunk in chunks)


def test_build_history_blocks_preserves_roles() -> None:
    history = build_history_blocks([("user", "What is pydantic?"), ("assistant", "A validation library.")])
    assert history == ["User: What is pydantic?", "Assistant: A validation library."]
