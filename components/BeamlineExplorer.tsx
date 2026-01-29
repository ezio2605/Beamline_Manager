
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { BEAMLINE_MANUALS } from '../mockData';
import { BeamlineNode } from '../types';
import ASCIITreeView from './ASCIITreeView';

const BeamlineExplorer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const hasCenteredRef = useRef(false);
  const rootPointRef = useRef<d3.HierarchyPointNode<BeamlineNode> | null>(null);

  const [selectedBeamline, setSelectedBeamline] = useState<BeamlineNode | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<BeamlineNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'d3' | 'ascii'>('d3');

  // D3 state management for hierarchy
  const [rootHierarchy, setRootHierarchy] = useState<d3.HierarchyNode<BeamlineNode> | null>(null);

  // Draggable panel state
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const filteredBeamlines = BEAMLINE_MANUALS.filter(bl =>
    bl.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (selectedBeamline) {
      const root = d3.hierarchy(selectedBeamline);
      setRootHierarchy(root);
      hasCenteredRef.current = false;
      rootPointRef.current = null;
    } else {
      setRootHierarchy(null);
      setSelectedNodeData(null);
    }
  }, [selectedBeamline]);

  // Re-render D3 tree when switching back to D3 view
  useEffect(() => {
    if (viewMode === 'd3' && rootHierarchy && svgRef.current) {
      // Force re-render when switching to D3 view
      renderTree();
    }
  }, [viewMode]);

  // const handleZoom = (type: 'in' | 'out' | 'reset') => {
  //   if (!svgRef.current || !zoomRef.current || !containerRef.current) return;
  //   const svg = d3.select(svgRef.current);

  //   if (type === 'reset') {
  //     const height = containerRef.current.clientHeight;
  //     const width = containerRef.current.clientWidth;
  //     // Centered reset view
  //     svg.transition().duration(750).call(
  //       zoomRef.current.transform,
  //       d3.zoomIdentity.translate(150, height / 2).scale(0.7)
  //     );
  //   } else {
  //     svg.transition().duration(300).call(
  //       zoomRef.current.scaleBy,
  //       type === 'in' ? 1.3 : 0.7
  //     );
  //   }
  // };
  const handleZoom = (type: 'in' | 'out' | 'reset') => {
    if (!svgRef.current || !zoomRef.current || !containerRef.current || !rootHierarchy) return;
    const svg = d3.select(svgRef.current);

    if (type === 'reset') {
      // Recalculate bounds for reset
      const treeLayout = d3.tree<BeamlineNode>().nodeSize([100, 320]);
      const rootPoint = treeLayout(rootHierarchy);
      const nodes = rootPoint.descendants();

      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      nodes.forEach(node => {
        const pointNode = node as d3.HierarchyPointNode<BeamlineNode>;
        if (pointNode.x < minX) minX = pointNode.x;
        if (pointNode.x > maxX) maxX = pointNode.x;
        if (pointNode.y < minY) minY = pointNode.y;
        if (pointNode.y > maxY) maxY = pointNode.y;
      });

      const treeWidth = maxY - minY;
      const treeHeight = maxX - minX;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      const padding = 100;
      const scaleX = (width - padding * 2) / treeWidth;
      const scaleY = (height - padding * 2) / treeHeight;
      const scale = Math.min(scaleX, scaleY, 1);

      const centerX = (minY + maxY) / 2;
      const centerY = (minX + maxX) / 2;

      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-centerX, -centerY);

      svg
        .transition()
        .duration(750)
        .call(zoomRef.current.transform, transform);
    } else {
      svg
        .transition()
        .duration(300)
        .call(
          zoomRef.current.scaleBy,
          type === 'in' ? 1.3 : 0.7
        );
    }
  };

  const centerNode = (d: d3.HierarchyPointNode<BeamlineNode>) => {
    if (!svgRef.current || !zoomRef.current || !containerRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const t = d3.zoomIdentity
      .translate(width / 2 - d.y * 0.8, height / 2 - d.x * 0.8)
      .scale(0.8);

    svg.transition().duration(750).call(zoomRef.current.transform, t);
  };

  // Drag handlers for the file detail panel
  const handlePanelMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging from the header area
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;

    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();

    setIsDragging(true);
    setDragStart({
      x: e.clientX - containerRect.left - panelPosition.x,
      y: e.clientY - containerRect.top - panelPosition.y
    });
  };

  const handlePanelMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !panelRef.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const panelWidth = 360; // Fixed panel width
    const panelHeight = panelRef.current.offsetHeight;

    // Calculate position relative to container
    let newX = e.clientX - containerRect.left - dragStart.x;
    let newY = e.clientY - containerRect.top - dragStart.y;

    // Constrain to container bounds with padding
    const padding = 20;
    const maxX = containerRect.width - panelWidth - padding;
    const maxY = containerRect.height - panelHeight - padding;

    newX = Math.max(padding, Math.min(newX, maxX));
    newY = Math.max(padding, Math.min(newY, maxY));

    setPanelPosition({ x: newX, y: newY });
  }, [isDragging, dragStart]);

  const handlePanelMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePanelMouseMove);
      window.addEventListener('mouseup', handlePanelMouseUp);
      return () => {
        window.removeEventListener('mousemove', handlePanelMouseMove);
        window.removeEventListener('mouseup', handlePanelMouseUp);
      };
    }
  }, [isDragging, handlePanelMouseMove, handlePanelMouseUp]);

  // Reset panel position when a new file is selected
  useEffect(() => {
    if (selectedNodeData && selectedNodeData.type === 'file' && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      // Position at top-right with safe margins
      setPanelPosition({
        x: Math.max(20, containerRect.width - 400), // 360px panel + 40px margin
        y: 40
      });
    }
  }, [selectedNodeData]);

  const renderTree = useCallback(() => {
    if (!rootHierarchy || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const transition = svg.transition().duration(500);

    // Get or create main group
    let mainGroup = svg.select<SVGGElement>("g.main-group");
    if (mainGroup.empty()) {
      mainGroup = svg.append("g").attr("class", "main-group");
      mainGroup.append("g").attr("class", "links-layer");
      mainGroup.append("g").attr("class", "nodes-layer");
    }

    const linksLayer = mainGroup.select<SVGGElement>("g.links-layer");
    const nodesLayer = mainGroup.select<SVGGElement>("g.nodes-layer");

    // Layout configuration
    const treeLayout = d3.tree<BeamlineNode>().nodeSize([100, 320]);
    const rootPoint = treeLayout(rootHierarchy);
    rootPointRef.current = rootPoint;

    const nodes = rootPoint.descendants();
    const links = rootPoint.links();

    // Link generator
    const curveGenerator = d3.linkHorizontal<any, any>()
      .x(d => d.y)
      .y(d => d.x);

    // Identify the path to the selected node for highlighting
    const selectedPathSet = new Set<string>();
    if (selectedNodeData) {
      let current = nodes.find(n => n.data.name === selectedNodeData.name);
      while (current) {
        selectedPathSet.add(current.data.name);
        current = current.parent || undefined;
      }
    }

    // Update Links
    const link = linksLayer.selectAll<SVGPathElement, any>("path.link")
      .data(links, (d: any) => d.target.data.name);

    const linkEnter = link.enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 2)
      .attr("d", d => {
        const o = { x: d.source.x, y: d.source.y };
        return curveGenerator({ source: o, target: o });
      });

    link.merge(linkEnter as any)
      .transition(transition as any)
      .attr("d", curveGenerator)
      .attr("stroke", (d: any) => selectedPathSet.has(d.target.data.name) ? "#10b981" : "#cbd5e1")
      .attr("stroke-width", (d: any) => selectedPathSet.has(d.target.data.name) ? 5 : 2)
      .attr("stroke-opacity", (d: any) => selectedPathSet.has(d.target.data.name) ? 1 : 0.4);

    link.exit()
      .transition(transition as any)
      .attr("d", (d: any) => {
        const o = { x: d.source.x, y: d.source.y };
        return curveGenerator({ source: o, target: o });
      })
      .remove();

    // Update Nodes
    const node = nodesLayer.selectAll<SVGGElement, any>("g.node")
      .data(nodes, (d: any) => d.data.name);

    const nodeEnter = node.enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.y},${d.x})`)
      .on("click", (event, d) => {
        event.stopPropagation();

        // Expand/Collapse logic for internal nodes
        if (d.children || (d as any)._children) {
          if (d.children) {
            (d as any)._children = d.children;
            d.children = undefined;
          } else {
            d.children = (d as any)._children;
            (d as any)._children = undefined;
          }
          renderTree();
        }

        // We set selected node to show path trace, 
        // but UI logic later will hide the drawer for non-files.
        setSelectedNodeData(d.data);
        centerNode(d as d3.HierarchyPointNode<BeamlineNode>);
      })
      .attr("cursor", "pointer")
      .attr("opacity", 0);

    // Helper function to measure text width and truncate if needed
    const measureAndTruncateText = (text: string, maxWidth: number, fontSize: number = 12): { displayText: string, width: number } => {
      // Create temporary text element for measurement
      const tempText = nodesLayer.append("text")
        .attr("class", "text-[12px] font-bold")
        .style("font-size", `${fontSize}px`)
        .style("font-weight", "bold")
        .text(text);

      let bbox = (tempText.node() as SVGTextElement).getBBox();
      let displayText = text;

      // If text is too wide, truncate with ellipsis
      if (bbox.width > maxWidth) {
        let truncated = text;
        while (bbox.width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
          tempText.text(truncated + '...');
          bbox = (tempText.node() as SVGTextElement).getBBox();
        }
        displayText = truncated + '...';
      }

      const finalWidth = bbox.width;
      tempText.remove();

      return { displayText, width: finalWidth };
    };

    // Node Box - will be sized after text measurement
    const nodeRects = nodeEnter.append("rect")
      .attr("x", -10)
      .attr("y", -24)
      .attr("height", 48)
      .attr("rx", 16)
      .attr("ry", 16)
      .attr("class", "node-rect shadow-xl transition-all duration-300")
      .attr("fill", "white")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 2);

    // Text Label with dynamic measurement
    const nodeTexts = nodeEnter.append("text")
      .attr("dy", "0.35em")
      .attr("x", 25)
      .attr("class", "text-[12px] font-bold select-none fill-slate-700 tracking-tight");

    // Measure and set text content, then update box width
    nodeTexts.each(function (d) {
      const maxTextWidth = 250; // Maximum text width in pixels
      const { displayText, width } = measureAndTruncateText(d.data.name, maxTextWidth);

      d3.select(this).text(displayText);

      // Update the corresponding rect width based on measured text
      const boxWidth = Math.max(150, width + 60); // 60px for padding (25px left + 35px right for icon and spacing)
      d3.select(this.parentNode as SVGGElement)
        .select("rect.node-rect")
        .attr("width", boxWidth);
    });

    // Status/Icon Indicator
    nodeEnter.append("circle")
      .attr("class", "status-dot")
      .attr("r", 6)
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("fill", d => d.data.type === 'file' ? '#f59e0b' : '#6366f1')
      .attr("stroke", "white")
      .attr("stroke-width", 2.5);

    // Collapse Indicator (+/-)
    nodeEnter.append("text")
      .attr("class", "collapse-icon font-black select-none")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("x", 0)
      .attr("y", 0)
      .attr("fill", "white")
      .attr("font-size", "9px")
      .text(d => (d as any)._children ? "+" : "");

    const nodeUpdate = node.merge(nodeEnter as any)
      .transition(transition as any)
      .attr("transform", d => `translate(${d.y},${d.x})`)
      .attr("opacity", 1);

    nodeUpdate.select<SVGRectElement>("rect.node-rect")
      .attr("stroke", d => (selectedPathSet.has(d.data.name)) ? "#10b981" : (d.data.type === 'file' ? "#f59e0b" : "#6366f1"))
      .attr("stroke-width", d => (selectedPathSet.has(d.data.name)) ? 4 : 2)
      .attr("fill", d => (d.data.name === selectedNodeData?.name) ? "#f0fdf4" : "white");

    nodeUpdate.select<SVGTextElement>("text.collapse-icon")
      .text(d => (d as any)._children ? "+" : (d.children ? "−" : ""));

    node.exit()
      .transition(transition as any)
      .attr("opacity", 0)
      .attr("transform", (d: any) => `translate(${d.y},${d.x})`)
      .remove();

  }, [rootHierarchy, selectedNodeData]);

  // Handle Zoom and Initial Render
  useEffect(() => {
    if (!rootHierarchy || !svgRef.current || !containerRef.current || viewMode !== 'd3') return;

    const svg = d3.select(svgRef.current);

    // Define Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        svg.select("g.main-group").attr("transform", event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Calculate tree bounds for dynamic sizing
    const treeLayout = d3.tree<BeamlineNode>().nodeSize([100, 320]);
    const rootPoint = treeLayout(rootHierarchy);
    const nodes = rootPoint.descendants();

    // Find bounds of the tree
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    nodes.forEach(node => {
      const pointNode = node as d3.HierarchyPointNode<BeamlineNode>;
      if (pointNode.x < minX) minX = pointNode.x;
      if (pointNode.x > maxX) maxX = pointNode.x;
      if (pointNode.y < minY) minY = pointNode.y;
      if (pointNode.y > maxY) maxY = pointNode.y;
    });

    // Calculate dimensions
    const treeWidth = maxY - minY;
    const treeHeight = maxX - minX;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Calculate scale to fit with padding
    const padding = 100; // Padding around the tree
    const scaleX = (width - padding * 2) / treeWidth;
    const scaleY = (height - padding * 2) / treeHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1

    // Calculate center position
    const centerX = (minY + maxY) / 2;
    const centerY = (minX + maxX) / 2;

    // Create transform to center and scale the tree
    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-centerX, -centerY);

    // Apply initial transform
    svg.call(zoom.transform, transform);

    renderTree();
  }, [rootHierarchy, viewMode]);

  // Re-render when dependencies change
  useEffect(() => {
    renderTree();
  }, [renderTree, selectedNodeData]);

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current || !rootHierarchy) return;

    const resizeObserver = new ResizeObserver(() => {
      // Trigger a reset to refit the tree when container size changes
      handleZoom('reset');
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [rootHierarchy]);

  if (!selectedBeamline) {
    return (
      <div className="p-10 h-full flex flex-col gap-10 overflow-auto animate-in fade-in duration-700 bg-slate-50/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tight mb-3 ">Beamline Registry</h2>
            <p className="text-slate-500 font-bold text-lg flex items-center gap-3">
              <span className="w-10 h-1 bg-indigo-500 rounded-full"></span>
              {/* 26 Synchrotron Operative Cluster */}
            </p>
          </div>
          {/* <div className="relative w-full md:w-[500px]">
            <input
              type="text"
              placeholder="Filter by Beamline ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-8 py-6 bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-2xl focus:ring-8 focus:ring-indigo-500/5 transition-all outline-none text-slate-800 font-bold text-lg"
            />
            <i className="fa-solid fa-magnifying-glass absolute left-6 top-7 text-slate-300 text-2xl"></i>
          </div> */}
          <div className="relative w-full md:w-[360px]">
            <input
              type="text"
              placeholder="Filter by Beamline ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-3 bg-white border-2 border-slate-100 rounded-2xl shadow-lg focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-slate-800 font-semibold text-sm"
            />
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-lg"></i>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-8 pb-20">
          {filteredBeamlines.map((bl) => (
            <button
              key={bl.name}
              onClick={() => setSelectedBeamline(bl.data)}
              className="group bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-3xl hover:border-indigo-500 hover:-translate-y-2 transition-all text-left flex flex-col h-32 relative overflow-hidden"
            >
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50/50 rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
              <h3 className="text-lg font-black text-slate-900 mb-1 relative z-10">{bl.name}</h3>
              <p className="text-[11px] text-slate-400 font-bold leading-tight flex-grow relative z-10 line-clamp-3">
                {bl.description || "Master operational framework for experimental physics and safety SOPs."}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white">
      {/* Floating Control Hub */}
      <div className="absolute top-10 left-10 flex flex-col gap-5 z-10">
        <div className="flex gap-4">
          <button
            onClick={() => { setSelectedBeamline(null); setSelectedNodeData(null); setViewMode('d3'); }}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl shadow-3xl hover:bg-black transition-all flex items-center gap-2 text-xs font-black group border-b-2 border-slate-800 active:border-b-0 active:translate-y-1"
          >
            <i className="fa-solid fa-arrow-left group-hover:-translate-x-1 transition-transform"></i>
            Back to Registry
          </button>

          {/* View Toggle Button */}
          <button
            onClick={() => setViewMode(viewMode === 'd3' ? 'ascii' : 'd3')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-3xl hover:bg-indigo-700 transition-all flex items-center gap-2 text-xs font-black border-b-2 border-indigo-800 active:border-b-0 active:translate-y-1"
          >
            <i className={`fa-solid ${viewMode === 'd3' ? 'fa-list-tree' : 'fa-project-diagram'}`}></i>
            {viewMode === 'd3' ? 'ASCII View' : 'Mindmap View'}
          </button>
        </div>

        {/* Zoom controls - only show in D3 mode */}
        {viewMode === 'd3' && (
          <div className="flex flex-col gap-2 w-fit">
            <div className="flex gap-2">
              <button
                onClick={() => handleZoom('in')}
                className="w-14 h-14 bg-white border border-slate-200 rounded-2xl shadow-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all hover:scale-110 active:scale-95"
                title="Zoom In"
              >
                <i className="fa-solid fa-plus"></i>
              </button>
              <button
                onClick={() => handleZoom('out')}
                className="w-14 h-14 bg-white border border-slate-200 rounded-2xl shadow-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all hover:scale-110 active:scale-95"
                title="Zoom Out"
              >
                <i className="fa-solid fa-minus"></i>
              </button>
              <button
                onClick={() => handleZoom('reset')}
                className="w-14 h-14 bg-white border border-slate-200 rounded-2xl shadow-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all hover:scale-110 active:scale-95"
                title="Reset View"
              >
                <i className="fa-solid fa-expand"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Conditional rendering based on view mode */}
      {viewMode === 'd3' ? (
        <svg
          ref={svgRef}
          className="w-full h-full cursor-move active:cursor-grabbing"
          onClick={() => setSelectedNodeData(null)}
        >
          {/* D3 handles group rendering inside via refs and callbacks */}
        </svg>
      ) : (
        <ASCIITreeView
          data={selectedBeamline}
          onNodeSelect={setSelectedNodeData}
          selectedNode={selectedNodeData}
          onDataChange={(updatedData) => {
            // Update the selected beamline with the modified data
            setSelectedBeamline(updatedData);
          }}
        />
      )}

      {/* Visual Connection Legend */}
      {/* <div className="absolute bottom-10 left-10 bg-white/90 backdrop-blur p-6 rounded-[2.5rem] shadow-3xl z-10 flex gap-8 items-center border border-slate-100 border-b-4 border-b-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/20"></div>
          <span className="text-[10px] font-black tracking-widest uppercase text-slate-500">System Branch</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-amber-500 rounded-full shadow-lg shadow-amber-500/20"></div>
          <span className="text-[10px] font-black tracking-widest uppercase text-slate-500">Resource File</span>
        </div>
        <div className="h-6 w-px bg-slate-200 mx-2"></div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-1 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/40"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Lineage Path</span>
        </div>
      </div> */}

      {/* Sidebar Details Panel - Restricted only to files as per request */}
      {selectedNodeData && selectedNodeData.type === 'file' && (
        <div
          ref={panelRef}
          className="absolute w-[360px] bg-white shadow-3xl rounded-[3rem] border-2 border-slate-50 p-8 z-20 flex flex-col gap-6 transition-shadow"
          style={{
            left: `${panelPosition.x}px`,
            top: `${panelPosition.y}px`,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={handlePanelMouseDown}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-black px-4 py-1.5 rounded-full tracking-[0.2em] uppercase shadow-sm bg-amber-100 text-amber-700">
                  FILE RESOURCE
                </span>
                {/* <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-2">
                  <i className="fa-solid fa-shield-check"></i> ACTIVE TRACE
                </span> */}
              </div>
              <h3 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">{selectedNodeData.name}</h3>
            </div>
            <button
              onClick={() => setSelectedNodeData(null)}
              className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all duration-300"
            >
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>

          <div className="space-y-12 overflow-y-auto max-h-[60vh] pr-4 custom-scrollbar" style={{ cursor: 'auto' }}>
            <div className="relative">
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">Overview</p>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed font-medium italic relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 group-hover:bg-emerald-500 transition-colors"></div>
                {selectedNodeData.description || "Master technical attachment for beamline infrastructure. Essential for safety and compliance procedures."}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">View File</p>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 group hover:border-indigo-400 transition-all shadow-sm hover:shadow-lg">
                <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center shadow-inner group-hover:rotate-3 transition-transform">
                  <i className="fa-solid fa-file-pdf text-2xl text-rose-500"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-800 truncate">{selectedNodeData.name}</p>
                  {/* <p className="text-[11px] text-slate-400 font-black tracking-widest uppercase">Verified Master • 2.4 MB</p> */}
                </div>
                <a
                  href={selectedNodeData.fileUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-slate-900 text-white rounded-xl shadow-md flex items-center justify-center hover:bg-indigo-600 hover:scale-105 active:scale-95 transition-all"
                >
                  <i className="fa-solid fa-arrow-down text-sm"></i>
                </a>
              </div>
            </div>

            {/* <div className="pt-10 border-t-2 border-slate-50">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-300 uppercase mb-6 tracking-[0.3em]">
                <span>Integrity Status</span>
                <span className="text-emerald-500 font-black flex items-center gap-2">
                  <i className="fa-solid fa-tower-broadcast animate-pulse"></i> SYNCHRONIZED
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-indigo-600 to-emerald-400 h-full w-[100%] rounded-full"></div>
              </div>
            </div> */}
          </div>
        </div>
      )}
    </div>
  );
};

export default BeamlineExplorer;
