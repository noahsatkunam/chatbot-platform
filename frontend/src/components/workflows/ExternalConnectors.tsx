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
  Switch,
  Alert,
  Tabs,
  Tab,
  Paper,
  Divider,
  Avatar,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Link as LinkIcon,
  Api as ApiIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Email as EmailIcon,
  Chat as ChatIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';

interface Connector {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  configuration: any;
  lastSync?: Date;
  isActive: boolean;
  icon: string;
  color: string;
}

interface ConnectorTemplate {
  type: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  configFields: ConfigField[];
  authType: 'api_key' | 'oauth' | 'basic' | 'custom';
  documentation?: string;
}

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'number' | 'select' | 'boolean';
  required: boolean;
  description?: string;
  options?: { value: string; label: string }[];
  validation?: string;
}

const connectorTemplates: ConnectorTemplate[] = [
  {
    type: 'slack',
    name: 'Slack',
    category: 'Communication',
    description: 'Send messages and notifications to Slack channels',
    icon: 'chat',
    color: '#4A154B',
    authType: 'oauth',
    configFields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', required: true },
      { key: 'signingSecret', label: 'Signing Secret', type: 'password', required: true },
      { key: 'defaultChannel', label: 'Default Channel', type: 'text', required: false }
    ]
  },
  {
    type: 'discord',
    name: 'Discord',
    category: 'Communication',
    description: 'Send messages to Discord servers and channels',
    icon: 'chat',
    color: '#5865F2',
    authType: 'api_key',
    configFields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', required: true },
      { key: 'guildId', label: 'Server ID', type: 'text', required: false }
    ]
  },
  {
    type: 'sendgrid',
    name: 'SendGrid',
    category: 'Email',
    description: 'Send emails via SendGrid API',
    icon: 'email',
    color: '#1A82E2',
    authType: 'api_key',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'fromEmail', label: 'From Email', type: 'text', required: true },
      { key: 'fromName', label: 'From Name', type: 'text', required: false }
    ]
  },
  {
    type: 'hubspot',
    name: 'HubSpot',
    category: 'CRM',
    description: 'Manage contacts and deals in HubSpot',
    icon: 'analytics',
    color: '#FF7A59',
    authType: 'oauth',
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'portalId', label: 'Portal ID', type: 'text', required: true }
    ]
  },
  {
    type: 'salesforce',
    name: 'Salesforce',
    category: 'CRM',
    description: 'Integrate with Salesforce CRM',
    icon: 'cloud',
    color: '#00A1E0',
    authType: 'oauth',
    configFields: [
      { key: 'instanceUrl', label: 'Instance URL', type: 'url', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: true }
    ]
  },
  {
    type: 'webhook',
    name: 'Webhook',
    category: 'Integration',
    description: 'Send HTTP requests to external endpoints',
    icon: 'api',
    color: '#6B7280',
    authType: 'custom',
    configFields: [
      { key: 'url', label: 'Webhook URL', type: 'url', required: true },
      { key: 'method', label: 'HTTP Method', type: 'select', required: true, 
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' }
        ]
      },
      { key: 'headers', label: 'Headers (JSON)', type: 'text', required: false },
      { key: 'authentication', label: 'Authentication', type: 'select', required: false,
        options: [
          { value: 'none', label: 'None' },
          { value: 'bearer', label: 'Bearer Token' },
          { value: 'basic', label: 'Basic Auth' },
          { value: 'api_key', label: 'API Key' }
        ]
      }
    ]
  }
];

const getIconComponent = (iconName: string) => {
  const icons: { [key: string]: React.ComponentType } = {
    chat: ChatIcon,
    email: EmailIcon,
    analytics: AnalyticsIcon,
    cloud: CloudIcon,
    api: ApiIcon,
    storage: StorageIcon
  };
  return icons[iconName] || ApiIcon;
};

export const ExternalConnectors: React.FC = () => {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ConnectorTemplate | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    loadConnectors();
  }, []);

  const loadConnectors = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockConnectors: Connector[] = [
        {
          id: '1',
          name: 'Company Slack',
          type: 'slack',
          category: 'Communication',
          description: 'Main company Slack workspace',
          status: 'connected',
          configuration: { botToken: '***', defaultChannel: '#general' },
          lastSync: new Date(),
          isActive: true,
          icon: 'chat',
          color: '#4A154B'
        },
        {
          id: '2',
          name: 'SendGrid Email',
          type: 'sendgrid',
          category: 'Email',
          description: 'Transactional email service',
          status: 'connected',
          configuration: { apiKey: '***', fromEmail: 'noreply@company.com' },
          lastSync: new Date(),
          isActive: true,
          icon: 'email',
          color: '#1A82E2'
        }
      ];
      setConnectors(mockConnectors);
    } catch (error) {
      console.error('Failed to load connectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConnector = () => {
    setSelectedTemplate(null);
    setFormData({});
    setCreateDialogOpen(true);
  };

  const handleSelectTemplate = (template: ConnectorTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      category: template.category,
      description: template.description
    });
  };

  const handleSaveConnector = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    try {
      const newConnector: Connector = {
        id: Date.now().toString(),
        name: formData.name,
        type: selectedTemplate.type,
        category: selectedTemplate.category,
        description: formData.description,
        status: 'disconnected',
        configuration: { ...formData },
        isActive: false,
        icon: selectedTemplate.icon,
        color: selectedTemplate.color
      };

      setConnectors(prev => [...prev, newConnector]);
      setCreateDialogOpen(false);
      setFormData({});
    } catch (error) {
      console.error('Failed to create connector:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditConnector = (connector: Connector) => {
    setSelectedConnector(connector);
    setFormData({ ...connector.configuration });
    setEditDialogOpen(true);
  };

  const handleUpdateConnector = async () => {
    if (!selectedConnector) return;

    setLoading(true);
    try {
      setConnectors(prev => prev.map(c => 
        c.id === selectedConnector.id 
          ? { ...c, configuration: { ...formData } }
          : c
      ));
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update connector:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (connector: Connector) => {
    setSelectedConnector(connector);
    setTestResult(null);
    setTestDialogOpen(true);
    
    setLoading(true);
    try {
      // Mock test - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = Math.random() > 0.3; // 70% success rate for demo
      setTestResult({
        success,
        message: success 
          ? 'Connection test successful!' 
          : 'Connection failed: Invalid credentials',
        details: success 
          ? { latency: '45ms', version: '1.2.3' }
          : { error: 'Authentication failed' }
      });

      if (success) {
        setConnectors(prev => prev.map(c => 
          c.id === connector.id 
            ? { ...c, status: 'connected', lastSync: new Date() }
            : c
        ));
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Test failed: Network error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConnector = async (connectorId: string, isActive: boolean) => {
    setConnectors(prev => prev.map(c => 
      c.id === connectorId ? { ...c, isActive } : c
    ));
  };

  const handleDeleteConnector = async (connectorId: string) => {
    if (window.confirm('Are you sure you want to delete this connector?')) {
      setConnectors(prev => prev.filter(c => c.id !== connectorId));
    }
  };

  const renderConnectorCard = (connector: Connector) => {
    const IconComponent = getIconComponent(connector.icon);
    
    return (
      <Card key={connector.id} sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar sx={{ bgcolor: connector.color, mr: 2 }}>
              <IconComponent />
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6">{connector.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {connector.description}
              </Typography>
            </Box>
            <Switch
              checked={connector.isActive}
              onChange={(e) => handleToggleConnector(connector.id, e.target.checked)}
              size="small"
            />
          </Box>

          <Box display="flex" alignItems="center" mb={2}>
            <Chip
              icon={connector.status === 'connected' ? <CheckCircleIcon /> : <ErrorIcon />}
              label={connector.status.charAt(0).toUpperCase() + connector.status.slice(1)}
              color={connector.status === 'connected' ? 'success' : 'error'}
              size="small"
              sx={{ mr: 1 }}
            />
            <Chip
              label={connector.category}
              variant="outlined"
              size="small"
            />
          </Box>

          {connector.lastSync && (
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              Last sync: {connector.lastSync.toLocaleString()}
            </Typography>
          )}

          <Box display="flex" gap={1}>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => handleTestConnection(connector)}
              disabled={loading}
            >
              Test
            </Button>
            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={() => handleEditConnector(connector)}
            >
              Edit
            </Button>
            <IconButton
              size="small"
              onClick={() => handleDeleteConnector(connector.id)}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderTemplateCard = (template: ConnectorTemplate) => {
    const IconComponent = getIconComponent(template.icon);
    
    return (
      <Card 
        key={template.type} 
        sx={{ 
          height: '100%', 
          cursor: 'pointer',
          '&:hover': { boxShadow: 4 }
        }}
        onClick={() => handleSelectTemplate(template)}
      >
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar sx={{ bgcolor: template.color, mr: 2 }}>
              <IconComponent />
            </Avatar>
            <Box>
              <Typography variant="h6">{template.name}</Typography>
              <Chip label={template.category} size="small" variant="outlined" />
            </Box>
          </Box>
          
          <Typography variant="body2" color="text.secondary" mb={2}>
            {template.description}
          </Typography>

          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Chip 
              label={template.authType.replace('_', ' ').toUpperCase()} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
            <Button size="small" startIcon={<AddIcon />}>
              Add
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderConfigurationForm = (fields: ConfigField[]) => {
    return fields.map((field) => (
      <Box key={field.key} mb={2}>
        {field.type === 'select' ? (
          <FormControl fullWidth>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={formData[field.key] || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
              required={field.required}
            >
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : field.type === 'boolean' ? (
          <Box display="flex" alignItems="center">
            <Switch
              checked={formData[field.key] || false}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.checked }))}
            />
            <Typography ml={1}>{field.label}</Typography>
          </Box>
        ) : (
          <TextField
            fullWidth
            label={field.label}
            type={field.type}
            value={formData[field.key] || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
            required={field.required}
            helperText={field.description}
            multiline={field.key === 'headers'}
            rows={field.key === 'headers' ? 3 : 1}
          />
        )}
      </Box>
    ));
  };

  const categories = Array.from(new Set(connectorTemplates.map(t => t.category)));

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">External Connectors</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateConnector}
        >
          Add Connector
        </Button>
      </Box>

      <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="My Connectors" />
        <Tab label="Available Templates" />
        <Tab label="Settings" />
      </Tabs>

      {selectedTab === 0 && (
        <Box>
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          
          {connectors.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <LinkIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No connectors configured
              </Typography>
              <Typography color="text.secondary" mb={3}>
                Add your first external service connector to start integrating with workflows
              </Typography>
              <Button variant="contained" onClick={handleCreateConnector}>
                Add Connector
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {connectors.map(renderConnectorCard)}
            </Grid>
          )}
        </Box>
      )}

      {selectedTab === 1 && (
        <Box>
          {categories.map((category) => (
            <Box key={category} mb={4}>
              <Typography variant="h6" gutterBottom>
                {category}
              </Typography>
              <Grid container spacing={3}>
                {connectorTemplates
                  .filter(t => t.category === category)
                  .map(renderTemplateCard)}
              </Grid>
            </Box>
          ))}
        </Box>
      )}

      {selectedTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Connector Settings
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            Global settings for external connectors and integrations
          </Alert>
          
          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom>
              Connection Timeout
            </Typography>
            <TextField
              type="number"
              label="Timeout (seconds)"
              defaultValue={30}
              sx={{ width: 200 }}
            />
          </Box>

          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom>
              Retry Settings
            </Typography>
            <TextField
              type="number"
              label="Max Retries"
              defaultValue={3}
              sx={{ width: 200, mr: 2 }}
            />
            <TextField
              type="number"
              label="Retry Delay (ms)"
              defaultValue={1000}
              sx={{ width: 200 }}
            />
          </Box>

          <Button variant="contained">
            Save Settings
          </Button>
        </Paper>
      )}

      {/* Create Connector Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedTemplate ? `Configure ${selectedTemplate.name}` : 'Select Connector Type'}
        </DialogTitle>
        <DialogContent>
          {!selectedTemplate ? (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {connectorTemplates.map(renderTemplateCard)}
            </Grid>
          ) : (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Connector Name"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Description"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                Configuration
              </Typography>
              
              {renderConfigurationForm(selectedTemplate.configFields)}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          {selectedTemplate && (
            <Button onClick={handleSaveConnector} variant="contained" disabled={loading}>
              Create Connector
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Edit Connector Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Connector</DialogTitle>
        <DialogContent>
          {selectedConnector && (
            <Box sx={{ mt: 2 }}>
              {renderConfigurationForm(
                connectorTemplates.find(t => t.type === selectedConnector.type)?.configFields || []
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateConnector} variant="contained" disabled={loading}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Connection Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Test Connection</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box display="flex" alignItems="center" py={3}>
              <LinearProgress sx={{ flex: 1, mr: 2 }} />
              <Typography>Testing connection...</Typography>
            </Box>
          ) : testResult ? (
            <Box sx={{ mt: 2 }}>
              <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                {testResult.message}
              </Alert>
              
              {testResult.details && (
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Details:
                  </Typography>
                  <pre style={{ fontSize: '0.875rem', margin: 0 }}>
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                </Paper>
              )}
            </Box>
          ) : (
            <Typography>Click "Test" to verify the connection.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Close</Button>
          {selectedConnector && !loading && (
            <Button 
              onClick={() => handleTestConnection(selectedConnector)} 
              variant="contained"
            >
              Test Again
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExternalConnectors;
