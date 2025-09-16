import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
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
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Tabs,
  Tab,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Tooltip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Code as CodeIcon,
  Transform as TransformIcon,
  DataObject as DataObjectIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Functions as FunctionsIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface TransformationRule {
  id: string;
  name: string;
  description: string;
  type: 'filter' | 'map' | 'reduce' | 'sort' | 'validate' | 'custom';
  configuration: any;
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

interface TransformationPipeline {
  id: string;
  name: string;
  description: string;
  rules: TransformationRule[];
  inputSchema?: any;
  outputSchema?: any;
  isActive: boolean;
  createdAt: Date;
}

const transformationTypes = [
  {
    type: 'filter',
    name: 'Filter',
    description: 'Filter data based on conditions',
    icon: FilterIcon,
    color: '#2196F3',
    template: {
      condition: 'item => item.value > 0',
      description: 'Keep items where value is greater than 0'
    }
  },
  {
    type: 'map',
    name: 'Map/Transform',
    description: 'Transform each item in the data',
    icon: TransformIcon,
    color: '#4CAF50',
    template: {
      transformation: 'item => ({ ...item, processed: true })',
      description: 'Add processed flag to each item'
    }
  },
  {
    type: 'reduce',
    name: 'Aggregate',
    description: 'Aggregate data into summary values',
    icon: FunctionsIcon,
    color: '#FF9800',
    template: {
      reducer: '(acc, item) => acc + item.value',
      initialValue: '0',
      description: 'Sum all values'
    }
  },
  {
    type: 'sort',
    name: 'Sort',
    description: 'Sort data by specified criteria',
    icon: SortIcon,
    color: '#9C27B0',
    template: {
      sortBy: 'createdAt',
      order: 'desc',
      description: 'Sort by creation date (newest first)'
    }
  },
  {
    type: 'validate',
    name: 'Validate',
    description: 'Validate data against schema',
    icon: DataObjectIcon,
    color: '#F44336',
    template: {
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          value: { type: 'number' }
        },
        required: ['id', 'value']
      },
      description: 'Validate required fields'
    }
  },
  {
    type: 'custom',
    name: 'Custom Function',
    description: 'Custom JavaScript transformation',
    icon: CodeIcon,
    color: '#607D8B',
    template: {
      function: `function transform(data, context) {
  // Your custom transformation logic here
  return data.map(item => ({
    ...item,
    timestamp: new Date().toISOString()
  }));
}`,
      description: 'Custom transformation function'
    }
  }
];

const sampleData = [
  { id: '1', name: 'John Doe', email: 'john@example.com', age: 30, active: true },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', age: 25, active: false },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', age: 35, active: true }
];

export const DataTransformation: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [pipelines, setPipelines] = useState<TransformationPipeline[]>([]);
  const [rules, setRules] = useState<TransformationRule[]>([]);
  const [createPipelineOpen, setCreatePipelineOpen] = useState(false);
  const [createRuleOpen, setCreateRuleOpen] = useState(false);
  const [testPipelineOpen, setTestPipelineOpen] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<TransformationPipeline | null>(null);
  const [selectedRule, setSelectedRule] = useState<TransformationRule | null>(null);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [testData, setTestData] = useState<any>(sampleData);
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPipelines();
    loadRules();
  }, []);

  const loadPipelines = async () => {
    // Mock data - replace with actual API call
    const mockPipelines: TransformationPipeline[] = [
      {
        id: '1',
        name: 'User Data Processing',
        description: 'Clean and validate user registration data',
        rules: [],
        isActive: true,
        createdAt: new Date()
      },
      {
        id: '2',
        name: 'Analytics Aggregation',
        description: 'Aggregate analytics data for reporting',
        rules: [],
        isActive: true,
        createdAt: new Date()
      }
    ];
    setPipelines(mockPipelines);
  };

  const loadRules = async () => {
    // Mock data - replace with actual API call
    const mockRules: TransformationRule[] = [
      {
        id: '1',
        name: 'Filter Active Users',
        description: 'Keep only active users',
        type: 'filter',
        configuration: { condition: 'item => item.active === true' },
        isActive: true,
        createdAt: new Date()
      },
      {
        id: '2',
        name: 'Add Full Name',
        description: 'Combine first and last name',
        type: 'map',
        configuration: { 
          transformation: 'item => ({ ...item, fullName: `${item.firstName} ${item.lastName}` })'
        },
        isActive: true,
        createdAt: new Date()
      }
    ];
    setRules(mockRules);
  };

  const handleCreatePipeline = () => {
    setFormData({});
    setCreatePipelineOpen(true);
  };

  const handleCreateRule = (type?: any) => {
    if (type) {
      setSelectedType(type);
      setFormData({
        name: type.name,
        description: type.description,
        type: type.type,
        configuration: type.template
      });
    } else {
      setSelectedType(null);
      setFormData({});
    }
    setCreateRuleOpen(true);
  };

  const handleSavePipeline = async () => {
    setLoading(true);
    try {
      const newPipeline: TransformationPipeline = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        rules: [],
        isActive: true,
        createdAt: new Date()
      };

      setPipelines(prev => [...prev, newPipeline]);
      setCreatePipelineOpen(false);
    } catch (error) {
      console.error('Failed to create pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async () => {
    setLoading(true);
    try {
      const newRule: TransformationRule = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        type: formData.type,
        configuration: formData.configuration,
        isActive: true,
        createdAt: new Date()
      };

      setRules(prev => [...prev, newRule]);
      setCreateRuleOpen(false);
    } catch (error) {
      console.error('Failed to create rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestPipeline = (pipeline: TransformationPipeline) => {
    setSelectedPipeline(pipeline);
    setTestData(sampleData);
    setTestResult(null);
    setTestPipelineOpen(true);
  };

  const runTransformation = async () => {
    if (!selectedPipeline) return;

    setLoading(true);
    try {
      // Simulate transformation execution
      let result = [...testData];
      
      for (const rule of selectedPipeline.rules) {
        switch (rule.type) {
          case 'filter':
            const filterFn = new Function('return ' + rule.configuration.condition)();
            result = result.filter(filterFn);
            break;
          case 'map':
            const mapFn = new Function('return ' + rule.configuration.transformation)();
            result = result.map(mapFn);
            break;
          case 'sort':
            const { sortBy, order } = rule.configuration;
            result.sort((a, b) => {
              const aVal = a[sortBy];
              const bVal = b[sortBy];
              const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
              return order === 'desc' ? -comparison : comparison;
            });
            break;
        }
      }

      setTestResult({
        success: true,
        input: testData,
        output: result,
        stats: {
          inputCount: testData.length,
          outputCount: result.length,
          processingTime: Math.random() * 100 + 50
        }
      });
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Transformation failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const addRuleToPipeline = (pipelineId: string, ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    setPipelines(prev => prev.map(p => 
      p.id === pipelineId 
        ? { ...p, rules: [...p.rules, rule] }
        : p
    ));
  };

  const removeRuleFromPipeline = (pipelineId: string, ruleId: string) => {
    setPipelines(prev => prev.map(p => 
      p.id === pipelineId 
        ? { ...p, rules: p.rules.filter(r => r.id !== ruleId) }
        : p
    ));
  };

  const renderRuleCard = (rule: TransformationRule, showActions = true) => {
    const typeInfo = transformationTypes.find(t => t.type === rule.type);
    const IconComponent = typeInfo?.icon || CodeIcon;

    return (
      <Card key={rule.id} sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <IconComponent sx={{ color: typeInfo?.color, mr: 2 }} />
            <Box flex={1}>
              <Typography variant="h6">{rule.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {rule.description}
              </Typography>
            </Box>
            {showActions && (
              <Box>
                <Switch
                  checked={rule.isActive}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <IconButton size="small">
                  <EditIcon />
                </IconButton>
                <IconButton size="small" color="error">
                  <DeleteIcon />
                </IconButton>
              </Box>
            )}
          </Box>

          <Chip
            label={typeInfo?.name || rule.type}
            size="small"
            sx={{ bgcolor: typeInfo?.color, color: 'white' }}
          />

          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">Configuration</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <SyntaxHighlighter
                language="javascript"
                style={tomorrow}
                customStyle={{ fontSize: '0.875rem', margin: 0 }}
              >
                {JSON.stringify(rule.configuration, null, 2)}
              </SyntaxHighlighter>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>
    );
  };

  const renderPipelineCard = (pipeline: TransformationPipeline) => {
    return (
      <Card key={pipeline.id}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
            <Box>
              <Typography variant="h6">{pipeline.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {pipeline.description}
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Button
                size="small"
                startIcon={<PlayIcon />}
                onClick={() => handleTestPipeline(pipeline)}
              >
                Test
              </Button>
              <IconButton size="small">
                <EditIcon />
              </IconButton>
              <IconButton size="small" color="error">
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" mb={2}>
            <Chip
              label={`${pipeline.rules.length} rules`}
              size="small"
              variant="outlined"
              sx={{ mr: 1 }}
            />
            <Chip
              label={pipeline.isActive ? 'Active' : 'Inactive'}
              size="small"
              color={pipeline.isActive ? 'success' : 'default'}
            />
          </Box>

          {pipeline.rules.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Transformation Rules:
              </Typography>
              {pipeline.rules.map((rule, index) => (
                <Box key={rule.id} display="flex" alignItems="center" mb={1}>
                  <Typography variant="body2" sx={{ mr: 2 }}>
                    {index + 1}.
                  </Typography>
                  <Chip
                    label={rule.name}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => removeRuleFromPipeline(pipeline.id, rule.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Add Rule</InputLabel>
            <Select
              value=""
              onChange={(e) => addRuleToPipeline(pipeline.id, e.target.value)}
            >
              {rules.map((rule) => (
                <MenuItem key={rule.id} value={rule.id}>
                  {rule.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Data Transformation</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleCreateRule()}
          >
            Add Rule
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreatePipeline}
          >
            Create Pipeline
          </Button>
        </Box>
      </Box>

      <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Pipelines" />
        <Tab label="Rules Library" />
        <Tab label="Templates" />
      </Tabs>

      {selectedTab === 0 && (
        <Box>
          {pipelines.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <TransformIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No transformation pipelines
              </Typography>
              <Typography color="text.secondary" mb={3}>
                Create your first data transformation pipeline to process workflow data
              </Typography>
              <Button variant="contained" onClick={handleCreatePipeline}>
                Create Pipeline
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {pipelines.map(renderPipelineCard)}
            </Grid>
          )}
        </Box>
      )}

      {selectedTab === 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Transformation Rules</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleCreateRule()}
            >
              Create Rule
            </Button>
          </Box>

          {rules.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <CodeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No transformation rules
              </Typography>
              <Typography color="text.secondary" mb={3}>
                Create reusable transformation rules for your data processing pipelines
              </Typography>
              <Button variant="contained" onClick={() => handleCreateRule()}>
                Create Rule
              </Button>
            </Paper>
          ) : (
            <Box>
              {rules.map(rule => renderRuleCard(rule))}
            </Box>
          )}
        </Box>
      )}

      {selectedTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Transformation Templates
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Quick start templates for common data transformation patterns
          </Typography>

          <Grid container spacing={3}>
            {transformationTypes.map((type) => {
              const IconComponent = type.icon;
              return (
                <Grid item xs={12} md={6} lg={4} key={type.type}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 4 }
                    }}
                    onClick={() => handleCreateRule(type)}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <IconComponent sx={{ color: type.color, mr: 2 }} />
                        <Typography variant="h6">{type.name}</Typography>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" mb={2}>
                        {type.description}
                      </Typography>

                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        sx={{ color: type.color }}
                      >
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Create Pipeline Dialog */}
      <Dialog open={createPipelineOpen} onClose={() => setCreatePipelineOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Transformation Pipeline</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Pipeline Name"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePipelineOpen(false)}>Cancel</Button>
          <Button onClick={handleSavePipeline} variant="contained" disabled={loading}>
            Create Pipeline
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Rule Dialog */}
      <Dialog open={createRuleOpen} onClose={() => setCreateRuleOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {selectedType ? `Create ${selectedType.name} Rule` : 'Create Transformation Rule'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Rule Name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  sx={{ mb: 2 }}
                />

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Transformation Type</InputLabel>
                  <Select
                    value={formData.type || ''}
                    onChange={(e) => {
                      const type = transformationTypes.find(t => t.type === e.target.value);
                      setFormData(prev => ({ 
                        ...prev, 
                        type: e.target.value,
                        configuration: type?.template || {}
                      }));
                    }}
                  >
                    {transformationTypes.map((type) => (
                      <MenuItem key={type.type} value={type.type}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Configuration
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50', height: 300, overflow: 'auto' }}>
                  <SyntaxHighlighter
                    language="javascript"
                    style={tomorrow}
                    customStyle={{ fontSize: '0.875rem', margin: 0 }}
                  >
                    {JSON.stringify(formData.configuration || {}, null, 2)}
                  </SyntaxHighlighter>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRuleOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveRule} variant="contained" disabled={loading}>
            Create Rule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Pipeline Dialog */}
      <Dialog open={testPipelineOpen} onClose={() => setTestPipelineOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle>Test Transformation Pipeline</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Input Data
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  value={JSON.stringify(testData, null, 2)}
                  onChange={(e) => {
                    try {
                      setTestData(JSON.parse(e.target.value));
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  sx={{ mb: 2 }}
                />
                
                <Button
                  variant="contained"
                  startIcon={<PlayIcon />}
                  onClick={runTransformation}
                  disabled={loading}
                  fullWidth
                >
                  Run Transformation
                </Button>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Output
                </Typography>
                
                {loading && <LinearProgress sx={{ mb: 2 }} />}
                
                {testResult && (
                  <Box>
                    {testResult.success ? (
                      <Box>
                        <Alert severity="success" sx={{ mb: 2 }}>
                          Transformation completed successfully!
                        </Alert>
                        
                        <Paper sx={{ p: 2, mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Statistics
                          </Typography>
                          <Typography variant="body2">
                            Input records: {testResult.stats.inputCount}
                          </Typography>
                          <Typography variant="body2">
                            Output records: {testResult.stats.outputCount}
                          </Typography>
                          <Typography variant="body2">
                            Processing time: {testResult.stats.processingTime.toFixed(2)}ms
                          </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, bgcolor: 'grey.50', height: 300, overflow: 'auto' }}>
                          <SyntaxHighlighter
                            language="json"
                            style={tomorrow}
                            customStyle={{ fontSize: '0.875rem', margin: 0 }}
                          >
                            {JSON.stringify(testResult.output, null, 2)}
                          </SyntaxHighlighter>
                        </Paper>
                      </Box>
                    ) : (
                      <Alert severity="error">
                        {testResult.error}
                      </Alert>
                    )}
                  </Box>
                )}
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestPipelineOpen(false)}>Close</Button>
          {testResult?.success && (
            <Button startIcon={<DownloadIcon />}>
              Export Result
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataTransformation;
