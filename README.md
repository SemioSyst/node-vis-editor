# Node-Based Interactive Visualisation Editor

A research prototype for authoring interactive, animated, and web-embeddable visualisations through a node-based workflow.

This project is part of a master's project exploring how visualisation authoring can be represented as a dataflow process: data is transformed into visual elements, visual elements are registered as interactive targets, user input drives visual states, and transitions turn state changes into animated responses.

## Overview

The editor provides a low-code node graph interface for constructing interactive visualisations. Instead of writing interaction code directly, users compose nodes that represent data inputs, mappings, visual generators, event triggers, states, transitions, layout rules, context-driven labels, and final export outputs.

A typical workflow follows this structure:

```txt
data
→ mapping
→ visual elements
→ interaction input
→ state change
→ transition / response
→ preview / final output