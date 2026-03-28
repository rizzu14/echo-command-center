import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useEchoStore } from '../../store';
import type { AgentType, A2AMessage } from '../../types';

interface NodeDatum extends d3.SimulationNodeDatum {
  id: AgentType;
  label: string;
  icon: string;
  status: string;
  healthScore: number;
}

interface LinkDatum extends d3.SimulationLinkDatum<NodeDatum> {
  count: number;
  source: NodeDatum | string;
  target: NodeDatum | string;
}

const AGENT_NODES: NodeDatum[] = [
  { id: 'AUDITOR', label: 'Auditor', icon: '🔍', status: 'HEALTHY', healthScore: 98 },
  { id: 'GOVERNOR', label: 'Governor', icon: '⚖️', status: 'HEALTHY', healthScore: 100 },
  { id: 'GREEN_ARCHITECT', label: 'Green Arch', icon: '🌿', status: 'HEALTHY', healthScore: 95 },
  { id: 'FINANCE', label: 'Finance', icon: '💹', status: 'HEALTHY', healthScore: 99 },
];

const STATUS_COLORS: Record<string, string> = {
  HEALTHY: '#3fb950',
  DEGRADED: '#d29922',
  UNAVAILABLE: '#f85149',
  ISOLATED: '#db6d28',
  SUSPENDED: '#bc8cff',
};

interface A2AGraphProps {
  onSelectMessage: (msg: A2AMessage | null) => void;
}

export function A2AGraph({ onSelectMessage }: A2AGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { a2aMessages, agents } = useEchoStore();
  const [selectedNode, setSelectedNode] = useState<AgentType | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 600;
    const height = svgRef.current.clientHeight || 400;

    // Count message frequency between pairs
    const linkMap = new Map<string, number>();
    a2aMessages.forEach((msg) => {
      const key = [msg.fromAgent, msg.toAgent].sort().join('--');
      linkMap.set(key, (linkMap.get(key) ?? 0) + 1);
    });

    const links: LinkDatum[] = [];
    linkMap.forEach((count, key) => {
      const [source, target] = key.split('--');
      links.push({ source, target, count });
    });

    // Update node health from store
    const nodes: NodeDatum[] = AGENT_NODES.map((n) => {
      const agent = agents.find((a) => a.type === n.id);
      return {
        ...n,
        status: agent?.status ?? n.status,
        healthScore: agent?.healthScore ?? n.healthScore,
      };
    });

    // Defs
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#484f58');

    // Simulation
    const simulation = d3.forceSimulation<NodeDatum>(nodes)
      .force('link', d3.forceLink<NodeDatum, LinkDatum>(links).id((d) => d.id).distance(160))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(50));

    // Links
    const link = svg.append('g')
      .selectAll<SVGLineElement, LinkDatum>('line')
      .data(links)
      .join('line')
      .attr('stroke', '#30363d')
      .attr('stroke-width', (d) => Math.min(d.count * 0.8 + 1, 5))
      .attr('marker-end', 'url(#arrowhead)')
      .attr('opacity', 0.7);

    // Animated particles on links
    const particles = svg.append('g').attr('class', 'particles');

    // Node groups
    const node = svg.append('g')
      .selectAll<SVGGElement, NodeDatum>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, NodeDatum>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (_, d) => {
        setSelectedNode((prev) => (prev === d.id ? null : d.id));
        // Show latest message involving this node
        const msg = a2aMessages.find((m) => m.fromAgent === d.id || m.toAgent === d.id);
        onSelectMessage(msg ?? null);
      });

    // Outer glow ring
    node.append('circle')
      .attr('r', 36)
      .attr('fill', 'none')
      .attr('stroke', (d) => STATUS_COLORS[d.status] ?? '#3fb950')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.3);

    // Node circle
    node.append('circle')
      .attr('r', 28)
      .attr('fill', '#21262d')
      .attr('stroke', (d) => STATUS_COLORS[d.status] ?? '#3fb950')
      .attr('stroke-width', 2);

    // Icon text
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('y', -4)
      .attr('font-size', '18px')
      .text((d) => d.icon);

    // Label
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 46)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#8b949e')
      .text((d) => d.label);

    // Health score
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 58)
      .attr('font-size', '10px')
      .attr('fill', (d) => STATUS_COLORS[d.status] ?? '#3fb950')
      .text((d) => `${d.healthScore}%`);

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'fixed')
      .style('pointer-events', 'none');

    node
      .on('mouseover', (event, d) => {
        tooltip
          .style('opacity', 1)
          .html(`<strong>${d.label}</strong><br/>Status: ${d.status}<br/>Health: ${d.healthScore}%`)
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY - 28}px`);
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY - 28}px`);
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
      });

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as NodeDatum).x ?? 0)
        .attr('y1', (d) => (d.source as NodeDatum).y ?? 0)
        .attr('x2', (d) => (d.target as NodeDatum).x ?? 0)
        .attr('y2', (d) => (d.target as NodeDatum).y ?? 0);

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [a2aMessages, agents, onSelectMessage]);

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', minHeight: 400 }}
    />
  );
}
