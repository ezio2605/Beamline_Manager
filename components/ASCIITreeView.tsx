import React, { useState, useCallback, useRef } from 'react';
import { BeamlineNode } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ASCIITreeViewProps {
    data: BeamlineNode;
    onNodeSelect?: (node: BeamlineNode) => void;
    selectedNode?: BeamlineNode | null;
    onDataChange?: (updatedData: BeamlineNode) => void;
}

interface TreeNodeProps {
    node: BeamlineNode;
    depth: number;
    isLast: boolean;
    prefix: string;
    onNodeSelect?: (node: BeamlineNode) => void;
    selectedNode?: BeamlineNode | null;
    onNodeUpdate: (oldNode: BeamlineNode, newNode: BeamlineNode) => void;
    onNodeDelete: (node: BeamlineNode) => void;
    onNodeAdd: (parentNode: BeamlineNode, newNode: BeamlineNode) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
    node,
    depth,
    isLast,
    prefix,
    onNodeSelect,
    selectedNode,
    onNodeUpdate,
    onNodeDelete,
    onNodeAdd,
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(node.name);
    const [editDescription, setEditDescription] = useState(node.description || '');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newNodeName, setNewNodeName] = useState('');
    const [newNodeType, setNewNodeType] = useState<'system' | 'procedure' | 'file'>('system');

    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNode?.name === node.name;

    // ASCII characters for tree structure
    const connector = isLast ? '└──' : '├──';
    const verticalLine = isLast ? '   ' : '│  ';

    const handleToggleCollapse = () => {
        if (hasChildren) {
            setIsCollapsed(!isCollapsed);
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
        setEditName(node.name);
        setEditDescription(node.description || '');
    };

    const handleSaveEdit = () => {
        const updatedNode = {
            ...node,
            name: editName,
            description: editDescription,
        };
        onNodeUpdate(node, updatedNode);
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditName(node.name);
        setEditDescription(node.description || '');
        setIsEditing(false);
    };

    const handleDelete = () => {
        if (confirm(`Delete "${node.name}"?`)) {
            onNodeDelete(node);
        }
    };

    const handleAddNode = () => {
        if (newNodeName.trim()) {
            const newNode: BeamlineNode = {
                name: newNodeName.trim(),
                type: newNodeType,
                children: newNodeType === 'file' ? undefined : [],
            };
            onNodeAdd(node, newNode);
            setNewNodeName('');
            setShowAddDialog(false);
        }
    };

    // Get icon based on node type
    const getIcon = () => {
        if (hasChildren) {
            return isCollapsed ? '▶' : '▼';
        }
        switch (node.type) {
            case 'beamline':
                return '🔬';
            case 'system':
                return '⚙️';
            case 'procedure':
                return '📋';
            case 'file':
                return '📄';
            default:
                return '•';
        }
    };

    // Get color class based on node type
    const getTypeColor = () => {
        switch (node.type) {
            case 'beamline':
                return 'text-purple-600';
            case 'system':
                return 'text-indigo-600';
            case 'procedure':
                return 'text-blue-600';
            case 'file':
                return 'text-amber-600';
            default:
                return 'text-slate-600';
        }
    };

    return (
        <div className="font-mono text-sm">
            {/* Current Node */}
            <div
                className={`flex items-start gap-2 py-1 px-2 rounded transition-colors ${isSelected ? 'bg-green-50 border-l-4 border-green-500' : 'hover:bg-slate-50'
                    }`}
            >
                {/* Tree structure characters */}
                <span className="text-slate-400 select-none whitespace-pre">{prefix + connector}</span>

                {/* Collapse/Expand icon */}
                <button
                    onClick={handleToggleCollapse}
                    className={`w-5 flex-shrink-0 text-center ${hasChildren ? 'cursor-pointer hover:text-indigo-600' : 'cursor-default'}`}
                    disabled={!hasChildren}
                >
                    {getIcon()}
                </button>

                {/* Node content */}
                {isEditing ? (
                    <div className="flex-1 space-y-2 bg-white p-3 rounded border-2 border-indigo-300 shadow-lg">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Name</label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                rows={2}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveEdit}
                                className="px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700"
                            >
                                Save
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1 bg-slate-300 text-slate-700 rounded text-xs font-bold hover:bg-slate-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-start justify-between group">
                        <div
                            className="flex-1 cursor-pointer"
                            onClick={() => onNodeSelect?.(node)}
                        >
                            <span className={`font-bold ${getTypeColor()}`}>{node.name}</span>
                            {node.description && (
                                <span className="text-slate-500 text-xs ml-2 italic">- {node.description}</span>
                            )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={handleEdit}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                title="Edit"
                            >
                                <i className="fa-solid fa-edit"></i>
                            </button>
                            {node.type !== 'file' && (
                                <button
                                    onClick={() => setShowAddDialog(!showAddDialog)}
                                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                    title="Add child"
                                >
                                    <i className="fa-solid fa-plus"></i>
                                </button>
                            )}
                            {node.type !== 'beamline' && (
                                <button
                                    onClick={handleDelete}
                                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                    title="Delete"
                                >
                                    <i className="fa-solid fa-trash"></i>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Add Node Dialog */}
            {showAddDialog && (
                <div className="ml-12 mt-2 mb-2 p-3 bg-green-50 border-2 border-green-300 rounded shadow-lg">
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Add New Node</h4>
                    <div className="space-y-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Name</label>
                            <input
                                type="text"
                                value={newNodeName}
                                onChange={(e) => setNewNodeName(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Enter node name"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                            <select
                                value={newNodeType}
                                onChange={(e) => setNewNodeType(e.target.value as 'system' | 'procedure' | 'file')}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                <option value="system">System</option>
                                <option value="procedure">Procedure</option>
                                <option value="file">File</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddNode}
                                className="px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddDialog(false);
                                    setNewNodeName('');
                                }}
                                className="px-3 py-1 bg-slate-300 text-slate-700 rounded text-xs font-bold hover:bg-slate-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Children */}
            {hasChildren && !isCollapsed && (
                <div>
                    {node.children!.map((child, index) => (
                        <TreeNode
                            key={child.name}
                            node={child}
                            depth={depth + 1}
                            isLast={index === node.children!.length - 1}
                            prefix={prefix + verticalLine}
                            onNodeSelect={onNodeSelect}
                            selectedNode={selectedNode}
                            onNodeUpdate={onNodeUpdate}
                            onNodeDelete={onNodeDelete}
                            onNodeAdd={onNodeAdd}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const ASCIITreeView: React.FC<ASCIITreeViewProps> = ({
    data,
    onNodeSelect,
    selectedNode,
    onDataChange,
}) => {
    const [treeData, setTreeData] = useState<BeamlineNode>(data);
    const [isExporting, setIsExporting] = useState(false);
    const treeContainerRef = useRef<HTMLDivElement>(null);

    // Update internal state when data prop changes
    React.useEffect(() => {
        setTreeData(data);
    }, [data]);

    // Helper function to find and update a node in the tree
    const updateNodeInTree = useCallback(
        (tree: BeamlineNode, oldNode: BeamlineNode, newNode: BeamlineNode): BeamlineNode => {
            if (tree.name === oldNode.name) {
                return newNode;
            }

            if (tree.children) {
                return {
                    ...tree,
                    children: tree.children.map((child) => updateNodeInTree(child, oldNode, newNode)),
                };
            }

            return tree;
        },
        []
    );

    // Helper function to delete a node from the tree
    const deleteNodeFromTree = useCallback((tree: BeamlineNode, nodeToDelete: BeamlineNode): BeamlineNode => {
        if (tree.children) {
            return {
                ...tree,
                children: tree.children
                    .filter((child) => child.name !== nodeToDelete.name)
                    .map((child) => deleteNodeFromTree(child, nodeToDelete)),
            };
        }
        return tree;
    }, []);

    // Helper function to add a node to the tree
    const addNodeToTree = useCallback(
        (tree: BeamlineNode, parentNode: BeamlineNode, newNode: BeamlineNode): BeamlineNode => {
            if (tree.name === parentNode.name) {
                return {
                    ...tree,
                    children: [...(tree.children || []), newNode],
                };
            }

            if (tree.children) {
                return {
                    ...tree,
                    children: tree.children.map((child) => addNodeToTree(child, parentNode, newNode)),
                };
            }

            return tree;
        },
        []
    );

    const handleNodeUpdate = useCallback(
        (oldNode: BeamlineNode, newNode: BeamlineNode) => {
            const updatedTree = updateNodeInTree(treeData, oldNode, newNode);
            setTreeData(updatedTree);
            onDataChange?.(updatedTree);
        },
        [treeData, updateNodeInTree, onDataChange]
    );

    const handleNodeDelete = useCallback(
        (node: BeamlineNode) => {
            const updatedTree = deleteNodeFromTree(treeData, node);
            setTreeData(updatedTree);
            onDataChange?.(updatedTree);
        },
        [treeData, deleteNodeFromTree, onDataChange]
    );

    const handleNodeAdd = useCallback(
        (parentNode: BeamlineNode, newNode: BeamlineNode) => {
            const updatedTree = addNodeToTree(treeData, parentNode, newNode);
            setTreeData(updatedTree);
            onDataChange?.(updatedTree);
        },
        [treeData, addNodeToTree, onDataChange]
    );

    // Function to generate text representation of the tree
    const generateTreeText = (node: BeamlineNode, prefix: string = '', isLast: boolean = true): string => {
        const connector = isLast ? '└── ' : '├── ';
        const verticalLine = isLast ? '    ' : '│   ';

        let result = prefix + connector + node.name;
        if (node.description) {
            result += ` - ${node.description}`;
        }
        result += '\n';

        if (node.children && node.children.length > 0) {
            node.children.forEach((child, index) => {
                const isLastChild = index === node.children!.length - 1;
                result += generateTreeText(child, prefix + verticalLine, isLastChild);
            });
        }

        return result;
    };

    // Export tree as PDF
    const exportAsPDF = async () => {
        if (!treeContainerRef.current) return;

        setIsExporting(true);
        try {
            // Capture the precise DOM element
            const canvas = await html2canvas(treeContainerRef.current, {
                scale: 2, // Higher quality
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true
            });

            const imgData = canvas.toDataURL('image/png');

            // A4 dimensions in mm
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;

            const imgWidth = pageWidth - (margin * 2);
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = margin;
            let page = 1;

            // Add title
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${treeData.name} - Tree Structure`, margin, margin); // Title at top

            // Adjust start position for the image
            const imageStartY = margin + 10;

            // Add first page image
            pdf.addImage(imgData, 'PNG', margin, imageStartY, imgWidth, imgHeight);

            // Handle multi-page if image is too long (basic implementation)
            // Ideally, we would split the canvas, but for now we scale/fit or just show what fits.
            // For a tree view, usually fitting to width is best. If it's super long, 
            // html2canvas capture might be huge. 
            // A simple approach for very long trees is just adding pages with offset.
            // However, typical usage might fit on 1-2 pages. 

            // For this implementation, we'll keep it simple: 
            // If it's taller than one page, we just let it be scaled or cutoff for now
            // or implement basic splitting if requested.
            // Given "weird spacing" issues, an exact screenshot is the priority.

            // Add timestamp footer
            const totalPages = pdf.getNumberOfPages();
            const timestamp = new Date().toLocaleString();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'normal');
                pdf.text(
                    `Generated: ${timestamp} | Page ${i}`,
                    margin,
                    pageHeight - 5
                );
            }

            // Save the PDF
            const filename = `${treeData.name.replace(/\s+/g, '_')}_tree_${new Date().getTime()}.pdf`;
            pdf.save(filename);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="w-full h-full overflow-auto bg-white p-6">
            <div className="mb-4 pb-4 border-b-2 border-slate-200 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">ASCII Tree View</h2>
                </div>
                <button
                    onClick={exportAsPDF}
                    disabled={isExporting}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md"
                    title="Export tree as PDF"
                >
                    {isExporting ? (
                        <>
                            <i className="fa-solid fa-spinner fa-spin"></i>
                            Generating PDF...
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-file-pdf"></i>
                            Export as PDF
                        </>
                    )}
                </button>
            </div>
            <div ref={treeContainerRef} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <TreeNode
                    node={treeData}
                    depth={0}
                    isLast={true}
                    prefix=""
                    onNodeSelect={onNodeSelect}
                    selectedNode={selectedNode}
                    onNodeUpdate={handleNodeUpdate}
                    onNodeDelete={handleNodeDelete}
                    onNodeAdd={handleNodeAdd}
                />
            </div>
        </div>
    );
};

export default ASCIITreeView;
