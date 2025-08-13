"use client";
import dynamic from 'next/dynamic';
import { PageHeader } from '@mysbc/ui';
import 'reactflow/dist/style.css';

const ReactFlow = dynamic(() => import('reactflow').then(m => m.ReactFlow), { ssr: false });

export default function FlowsPage() {
  return (
    <div>
      <PageHeader title="Integration Flow" />
      <div className="h-[70vh] border rounded">
        <ReactFlow nodes={[]} edges={[]} />
      </div>
    </div>
  );
}

