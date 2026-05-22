from langgraph.graph import END, StateGraph

from app.graph.nodes import (
    classify_business,
    geo_expand,
    validate_input,
)
from app.graph.state import ScanState


def build_graph() -> StateGraph:
    builder = StateGraph(ScanState)

    builder.add_node("validate", validate_input)
    builder.add_node("classify", classify_business)
    builder.add_node("geo_expand", geo_expand)

    builder.set_entry_point("validate")

    builder.add_edge("validate", "classify")
    builder.add_edge("classify", "geo_expand")
    builder.add_edge("geo_expand", END)

    return builder.compile()
