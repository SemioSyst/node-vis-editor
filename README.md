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

The system is designed around two key internal concepts:

Visual output: an intermediate visual tree describing shapes, paths, text, groups, and metadata.
Runtime specification: a sidecar object attached to visual outputs that describes events, states, transitions, effects, layout rules, context slots, slider controls, and scroll behaviours.

This allows interactive behaviour to travel with the visual output through later composition and export steps.

Key Features
Node-based visualisation authoring using React Flow.
Data input nodes for arrays and matrices.
Mapping nodes for scale, colour, and tag assignment.
Visual generator nodes for shapes, text, paths, axes, and sliders.
Coordinate grouping for layered visual composition.
Element selection and event trigger nodes.
Hover, click, press, scroll, and slider-based interactions.
State registration through the States node.
Animated transitions between visual states.
Progress-driven transitions for scroll and slider controls.
Context Slots for context-driven labels and tooltip-like components.
Position Rule for pointer-based, anchor-based, and repeated positioning.
Page Preview for testing scroll-responsive visualisations inside a pseudo-page.
Final Output node for exporting embeddable visual bundles.
Implemented Evaluation Scenarios

The project currently includes workflows used to construct several report/demo scenarios:

Scenario 1: CO₂ Heatmap with Hover Tooltip

A country-by-year heatmap showing CO₂ emissions per capita. Hovering over a cell highlights it and displays a context-driven tooltip with country, year, and value.

Demonstrates:

matrix-driven heatmap generation;
tag preservation from data to marks;
hover event composition;
context slots;
pointer-positioned tooltip;
final bundle export.
Scenario 2: COVID-19 Temporal Alignment Transition

A line chart that switches between calendar-date alignment and outbreak-relative time alignment. The same y-values are preserved while the x-axis definition changes.

Demonstrates:

matrix-driven path generation;
button-triggered state change;
path interpolation;
animated transition between complete chart states.
Scenario 3: Electricity Mix Scroll / Slider Story

A stacked bar visualisation of global electricity generation by source across several years. The same states can be driven either by page scroll steps or by a slider.

Demonstrates:

scroll-driven state progression;
slider-driven progress control;
multi-state transition;
local modification by replacing the event driver.
Architecture

The editor is organised around the following layers:

React Flow node editor
→ graph IR compiler
→ evaluator
→ visual output model
→ runtime specification
→ renderer / preview / export
Node Editor

The node editor is responsible for editing nodes, edges, layout positions, and node parameters. It does not directly draw final SVG elements.

Graph IR

The current React Flow graph is compiled into a graph IR containing node ids, node types, edges, source handles, and target handles. Source and target handles allow multi-output nodes such as Slider to expose separate visual and event outputs.

Evaluator

The evaluator executes nodes in topological order. Each node type has an evaluator that consumes upstream outputs and produces a new output, such as data, visual output, event signal, stateful visual output, or final output bundle.

Visual Output

A visual output contains a visual tree and optional runtime sidecar:

{
  outputType: 'visual',
  root: { ... },
  runtimeSpec: { ... },
  meta: { ... }
}
Runtime Specification

Runtime specifications describe dynamic behaviour:

states
events
stateRules
bindings
transitions
effects
layoutRules
contextSlots

The renderer and runtime apply these specifications during preview and embedded rendering.

Node Taxonomy

The current node system can be grouped into the following categories:

Data Source Nodes
Provide arrays, matrices, and raw values.
Data Mapping Nodes
Map raw values to visual parameters and semantic tags.
Visual Generator Nodes
Generate shapes, paths, text, axes, and visual controls.
Visual Composition Nodes
Combine visual layers and manage layout.
Element Selection Nodes
Select visual elements for downstream interaction.
Event / Progress Input Nodes
Produce click, hover, scroll, press, or slider signals.
State Definition Nodes
Register multiple visual states.
Transition Nodes
Define how visual states change over time.
Context-Driven Display Nodes
Register component slots that can be filled from event or anchor context.
Preview / Testing Nodes
Render and test visual outputs inside the editor.
Export Nodes
Produce embeddable visual bundles for external demo pages.
Installation
npm install
Development
npm run dev

Then open the local Vite URL shown in the terminal.

Build
npm run build
Basic Usage
Add data input nodes.
Map data into visual parameters using scale, colour, or tag nodes.
Generate visual elements with shape, path, text, or axis generator nodes.
Combine visual layers with Coordinate Group.
Add Element Selector and Event Trigger nodes for interactions.
Register visual states with States.
Add Transition for animation.
Use Preview or Page Preview to test output.
Connect the final visual to Final Output.
Export an embeddable bundle JSON.
Export Workflow

The Final Output node exports a .nodevis-embed.json bundle. The bundle contains:

visual root
runtimeSpec
render options
metadata

This bundle can be used by a separate Vite/React demo project through a VisualEmbed component.

The editor currently exports embeddable visual bundles rather than standalone HTML files. Standalone HTML export is planned as future work.

Demo Repository

A separate demo repository can be used to display exported bundles inside a traditional webpage. This separation allows the demo page to be written using normal React, HTML, and CSS while the visualisation itself is generated by the node-based editor.

Project Status

This is a research prototype. The implementation is intended to support design exploration and scenario-based evaluation rather than production deployment.

Current limitations include:

no packaged npm runtime yet;
no standalone HTML export yet;
tooltip and context display features are still prototype-level;
advanced layout constraints and collision handling are future work;
some workflows require manually prepared data arrays or matrices.
Future Work

Potential future extensions include:

packaged embeddable runtime;
standalone HTML export;
richer tooltip and annotation system;
conditional interaction logic;
more advanced timeline and animation authoring;
improved data import and transformation nodes;
responsive export settings;
more complete visual component reuse.