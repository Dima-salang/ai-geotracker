from langgraph.graph import END, StateGraph

from app.graph.nodes import (
    classify_business,
    geo_expand,
    validate_input,
    web_search,
)
from app.graph.state import ScanState


def build_graph() -> StateGraph:
    builder = StateGraph(ScanState)

    builder.add_node("validate", validate_input)
    builder.add_node("classify", classify_business)
    builder.add_node("geo_expand", geo_expand)
    builder.add_node("web_search", web_search)

    builder.set_entry_point("validate")

    builder.add_edge("validate", "classify")
    builder.add_edge("classify", "geo_expand")
    builder.add_edge("geo_expand", "web_search")
    builder.add_edge("web_search", END)

    return builder.compile()
