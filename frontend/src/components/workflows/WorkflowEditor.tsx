import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Toolbar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Tabs,
  Tab,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Drawer,
  AppBar
} from '@mui/material';
import {
  Save as SaveIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Code as CodeIcon,
  Visibility as PreviewIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  AccountTree as WorkflowIcon,
  Schedule as ScheduleIcon,
  Webhook as WebhookIcon,
  Email as EmailIcon,
  Chat as ChatIcon,
  Storage as DatabaseIcon,
  Api as ApiIcon
} from '@mui/icons-material';
import { useWorkflows } from '../../hooks/useWorkflows';

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  parameters: Record<string, any>;
  position: { x: number; y: number };
  connections: string[];
}

interface WorkflowEditorProps {
  workflow?: {
    id: string;
    name: string;
    description: string;
    nodes: WorkflowNode[];
    connections: any[];
    settings: Record<string, any>;
  } | null;
}

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ workflow }) => {
  const { saveWorkflow, executeWorkflow, validateWorkflow } = useWorkflows();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [workflowData, setWorkflowData] = useState(workflow);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // N8N Editor Integration
  const [n8nLoaded, setN8nLoaded] = useState(false);
  const [n8nError, setN8nError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize n8n iframe
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      
      iframe.onload = () => {
        setN8nLoaded(true);
        // Send workflow data to n8n if available
        if (workflowData) {
          sendWorkflowToN8n(workflowData);
        }
      };

      iframe.onerror = () => {
        setN8nError('Failed to load n8n editor');
      };
    }
  }, [workflowData]);

  const sendWorkflowToN8n = (data: any) => {
    if (iframeRef.current && n8nLoaded) {
      try {
        iframeRef.current.contentWindow?.postMessage({
          type: 'loadWorkflow',
          workflow: data
        }, '*');
      } catch (error) {
        console.error('Failed to send workflow to n8n:', error);
      }
    }
  };

  const receiveWorkflowFromN8n = () => {
    if (iframeRef.current && n8nLoaded) {
      try {
        iframeRef.current.contentWindow?.postMessage({
          type: 'getWorkflow'
        }, '*');
      } catch (error) {
        console.error('Failed to receive workflow from n8n:', error);
      }
    }
  };

  // Listen for messages from n8n iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const { type, data } = event.data;
      
      switch (type) {
        case 'workflowUpdated':
          setWorkflowData(data);
          break;
        case 'workflowSaved':
          handleSaveWorkflow(data);
          break;
        case 'validationError':
          setValidationErrors(data.errors);
          break;
        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSaveWorkflow = async (data?: any) => {
    try {
      const workflowToSave = data || workflowData;
      if (workflowToSave) {
        await saveWorkflow(workflowToSave);
        setSaveDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
    }
  };

  const handleExecuteWorkflow = async () => {
    try {
      if (workflowData?.id) {
        await executeWorkflow(workflowData.id);
        setTestDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const handleValidateWorkflow = async () => {
    try {
      if (workflowData) {
        const errors = await validateWorkflow(workflowData);
        setValidationErrors(errors);
      }
    } catch (error) {
      console.error('Failed to validate workflow:', error);
    }
  };

  const nodeTypes = [
    { type: 'trigger', name: 'Chat Trigger', icon: <ChatIcon />, category: 'Triggers' },
    { type: 'webhook', name: 'Webhook', icon: <WebhookIcon />, category: 'Triggers' },
    { type: 'schedule', name: 'Schedule', icon: <ScheduleIcon />, category: 'Triggers' },
    { type: 'email', name: 'Email', icon: <EmailIcon />, category: 'Communication' },
    { type: 'database', name: 'Database', icon: <DatabaseIcon />, category: 'Data' },
    { type: 'api', name: 'HTTP Request', icon: <ApiIcon />, category: 'Integration' },
    { type: 'condition', name: 'Condition', icon: <WorkflowIcon />, category: 'Logic' },
  ];

  const groupedNodeTypes = nodeTypes.reduce((acc, node) => {
    if (!acc[node.category]) {
      acc[node.category] = [];
    }
    acc[node.category].push(node);
    return acc;
  }, {} as Record<string, typeof nodeTypes>);

  const renderNodePalette = () => (
    <Box sx={{ width: 280, p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Node Library
      </Typography>
      {Object.entries(groupedNodeTypes).map(([category, nodes]) => (
        <Box key={category} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {category}
          </Typography>
          <List dense>
            {nodes.map((node) => (
              <ListItem
                key={node.type}
                button
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify(node));
                }}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {node.icon}
                </ListItemIcon>
                <ListItemText primary={node.name} />
              </ListItem>
            ))}
          </List>
        </Box>
      ))}
    </Box>
  );

  const renderPropertiesPanel = () => (
    <Box sx={{ width: 320, p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Properties
      </Typography>
      {selectedNode ? (
        <Box>
          <TextField
            fullWidth
            label="Node Name"
            value={selectedNode.name}
            onChange={(e) => {
              setSelectedNode({
                ...selectedNode,
                name: e.target.value
              });
            }}
            sx={{ mb: 2 }}
          />
          <Typography variant="subtitle2" gutterBottom>
            Parameters
          </Typography>
          {/* Dynamic parameter fields based on node type */}
          {Object.entries(selectedNode.parameters || {}).map(([key, value]) => (
            <TextField
              key={key}
              fullWidth
              label={key}
              value={value}
              onChange={(e) => {
                setSelectedNode({
                  ...selectedNode,
                  parameters: {
                    ...selectedNode.parameters,
                    [key]: e.target.value
                  }
                });
              }}
              sx={{ mb: 1 }}
            />
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={() => {
              const paramName = prompt('Parameter name:');
              if (paramName) {
                setSelectedNode({
                  ...selectedNode,
                  parameters: {
                    ...selectedNode.parameters,
                    [paramName]: ''
                  }
                });
              }
            }}
          >
            Add Parameter
          </Button>
        </Box>
      ) : (
        <Typography color="text.secondary">
          Select a node to edit its properties
        </Typography>
      )}
    </Box>
  );

  const renderEditor = () => (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {workflowData?.name || 'New Workflow'}
          </Typography>
          <Button
            startIcon={<SaveIcon />}
            onClick={() => setSaveDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            Save
          </Button>
          <Button
            startIcon={<PlayIcon />}
            onClick={() => setTestDialogOpen(true)}
            color="success"
            sx={{ mr: 1 }}
          >
            Test
          </Button>
          <Button
            startIcon={<CodeIcon />}
            onClick={handleValidateWorkflow}
            sx={{ mr: 1 }}
          >
            Validate
          </Button>
          <IconButton
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert severity="error" sx={{ m: 1 }}>
          <Typography variant="subtitle2">Validation Errors:</Typography>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Editor Content */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Visual Editor" />
          <Tab label="Code Editor" />
          <Tab label="Settings" />
        </Tabs>

        {activeTab === 0 && (
          <Box sx={{ height: '100%', position: 'relative' }}>
            {n8nError ? (
              <Alert severity="error" sx={{ m: 2 }}>
                {n8nError}
              </Alert>
            ) : (
              <iframe
                ref={iframeRef}
                src={`http://localhost:5678/workflow/new`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                title="N8N Workflow Editor"
              />
            )}
            {!n8nLoaded && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)'
                }}
              >
                <Typography>Loading workflow editor...</Typography>
              </Box>
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ p: 2, height: '100%' }}>
            <TextField
              fullWidth
              multiline
              rows={20}
              value={JSON.stringify(workflowData, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setWorkflowData(parsed);
                } catch (error) {
                  // Invalid JSON, don't update
                }
              }}
              variant="outlined"
              sx={{ fontFamily: 'monospace' }}
            />
          </Box>
        )}

        {activeTab === 2 && (
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    General Settings
                  </Typography>
                  <TextField
                    fullWidth
                    label="Workflow Name"
                    value={workflowData?.name || ''}
                    onChange={(e) => setWorkflowData({
                      ...workflowData,
                      name: e.target.value
                    } as any)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    value={workflowData?.description || ''}
                    onChange={(e) => setWorkflowData({
                      ...workflowData,
                      description: e.target.value
                    } as any)}
                    sx={{ mb: 2 }}
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Execution Settings
                  </Typography>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Execution Mode</InputLabel>
                    <Select
                      value={workflowData?.settings?.executionMode || 'trigger'}
                      label="Execution Mode"
                    >
                      <MenuItem value="trigger">On Trigger</MenuItem>
                      <MenuItem value="manual">Manual Only</MenuItem>
                      <MenuItem value="scheduled">Scheduled</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    type="number"
                    label="Timeout (seconds)"
                    value={workflowData?.settings?.timeout || 300}
                    sx={{ mb: 2 }}
                  />
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ 
      height: isFullscreen ? '100vh' : '80vh', 
      display: 'flex',
      position: isFullscreen ? 'fixed' : 'relative',
      top: isFullscreen ? 0 : 'auto',
      left: isFullscreen ? 0 : 'auto',
      right: isFullscreen ? 0 : 'auto',
      bottom: isFullscreen ? 0 : 'auto',
      zIndex: isFullscreen ? 9999 : 'auto',
      backgroundColor: 'background.default'
    }}>
      {/* Left Drawer - Node Palette */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          '& .MuiDrawer-paper': {
            position: isFullscreen ? 'fixed' : 'relative',
            height: '100%',
            borderRight: 1,
            borderColor: 'divider'
          }
        }}
      >
        {renderNodePalette()}
      </Drawer>

      {/* Main Editor */}
      {renderEditor()}

      {/* Right Drawer - Properties */}
      <Drawer
        variant="persistent"
        anchor="right"
        open={true}
        sx={{
          '& .MuiDrawer-paper': {
            position: isFullscreen ? 'fixed' : 'relative',
            height: '100%',
            borderLeft: 1,
            borderColor: 'divider'
          }
        }}
      >
        {renderPropertiesPanel()}
      </Drawer>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Workflow</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Workflow Name"
            fullWidth
            variant="outlined"
            value={workflowData?.name || ''}
            onChange={(e) => setWorkflowData({
              ...workflowData,
              name: e.target.value
            } as any)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => handleSaveWorkflow()} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)}>
        <DialogTitle>Test Workflow</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Execute this workflow with test data?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Test Input (JSON)"
            variant="outlined"
            defaultValue="{}"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleExecuteWorkflow} variant="contained" color="success">
            Execute
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
