import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating,
  Avatar,
  Divider,
  Tab,
  Tabs,
  Badge,
  Alert,
  Skeleton,
  Tooltip
} from '@mui/material';
import {
  GetApp as InstallIcon,
  Visibility as PreviewIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Category as CategoryIcon,
  TrendingUp as TrendingIcon,
  New as NewIcon,
  Verified as VerifiedIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useWorkflowTemplates } from '../../hooks/useWorkflowTemplates';
import { useAuth } from '../../hooks/useAuth';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: {
    name: string;
    avatar?: string;
    verified: boolean;
  };
  rating: number;
  downloads: number;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  preview: {
    nodes: number;
    complexity: 'simple' | 'medium' | 'complex';
    estimatedTime: string;
  };
  workflow: any;
  isOfficial: boolean;
  isFavorite?: boolean;
}

const categories = [
  { id: 'all', name: 'All Templates', icon: '📋' },
  { id: 'customer-service', name: 'Customer Service', icon: '🎧' },
  { id: 'lead-generation', name: 'Lead Generation', icon: '🎯' },
  { id: 'data-processing', name: 'Data Processing', icon: '📊' },
  { id: 'notifications', name: 'Notifications', icon: '🔔' },
  { id: 'integrations', name: 'Integrations', icon: '🔗' },
  { id: 'automation', name: 'Automation', icon: '⚡' },
  { id: 'analytics', name: 'Analytics', icon: '📈' },
  { id: 'social-media', name: 'Social Media', icon: '📱' }
];

export const WorkflowTemplates: React.FC = () => {
  const { user } = useAuth();
  const {
    templates,
    myTemplates,
    favorites,
    loading,
    error,
    fetchTemplates,
    fetchMyTemplates,
    fetchFavorites,
    installTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleFavorite,
    rateTemplate
  } = useWorkflowTemplates();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [previewDialog, setPreviewDialog] = useState<WorkflowTemplate | null>(null);
  const [installDialog, setInstallDialog] = useState<WorkflowTemplate | null>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [shareDialog, setShareDialog] = useState<WorkflowTemplate | null>(null);

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: '',
    tags: [] as string[],
    workflow: null as any,
    isPublic: true
  });

  useEffect(() => {
    fetchTemplates();
    if (user) {
      fetchMyTemplates();
      fetchFavorites();
    }
  }, [user]);

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.downloads - a.downloads;
      case 'rating':
        return b.rating - a.rating;
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const handleInstallTemplate = async (template: WorkflowTemplate, customName?: string) => {
    try {
      await installTemplate(template.id, customName);
      setInstallDialog(null);
    } catch (error) {
      console.error('Failed to install template:', error);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      await createTemplate(newTemplate);
      setCreateDialog(false);
      setNewTemplate({
        name: '',
        description: '',
        category: '',
        tags: [],
        workflow: null,
        isPublic: true
      });
      fetchMyTemplates();
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleToggleFavorite = async (templateId: string) => {
    try {
      await toggleFavorite(templateId);
      fetchTemplates();
      fetchFavorites();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleRateTemplate = async (templateId: string, rating: number) => {
    try {
      await rateTemplate(templateId, rating);
      fetchTemplates();
    } catch (error) {
      console.error('Failed to rate template:', error);
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'success';
      case 'medium': return 'warning';
      case 'complex': return 'error';
      default: return 'default';
    }
  };

  const renderTemplateCard = (template: WorkflowTemplate) => (
    <Grid item xs={12} sm={6} md={4} key={template.id}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h6" component="h2" noWrap sx={{ flexGrow: 1, mr: 1 }}>
              {template.name}
              {template.isOfficial && (
                <Tooltip title="Official Template">
                  <VerifiedIcon color="primary" sx={{ ml: 1, fontSize: 16 }} />
                </Tooltip>
              )}
            </Typography>
            <IconButton
              size="small"
              onClick={() => handleToggleFavorite(template.id)}
              color={template.isFavorite ? 'warning' : 'default'}
            >
              {template.isFavorite ? <StarIcon /> : <StarBorderIcon />}
            </IconButton>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
            {template.description}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar src={template.author.avatar} sx={{ width: 24, height: 24, mr: 1 }}>
              {template.author.name[0]}
            </Avatar>
            <Typography variant="caption" color="text.secondary">
              by {template.author.name}
              {template.author.verified && (
                <VerifiedIcon sx={{ ml: 0.5, fontSize: 12 }} color="primary" />
              )}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Rating value={template.rating} readOnly size="small" sx={{ mr: 1 }} />
            <Typography variant="caption" color="text.secondary">
              ({template.downloads} downloads)
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              label={template.category}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={template.preview.complexity}
              size="small"
              color={getComplexityColor(template.preview.complexity) as any}
            />
            <Chip
              label={`${template.preview.nodes} nodes`}
              size="small"
              variant="outlined"
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {template.tags.slice(0, 3).map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
            {template.tags.length > 3 && (
              <Chip label={`+${template.tags.length - 3}`} size="small" variant="outlined" />
            )}
          </Box>
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Box>
            <IconButton
              size="small"
              onClick={() => setPreviewDialog(template)}
            >
              <PreviewIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setShareDialog(template)}
            >
              <ShareIcon />
            </IconButton>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<InstallIcon />}
            onClick={() => setInstallDialog(template)}
          >
            Install
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  const renderMyTemplateCard = (template: WorkflowTemplate) => (
    <Grid item xs={12} sm={6} md={4} key={template.id}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h6" component="h2" noWrap sx={{ flexGrow: 1, mr: 1 }}>
              {template.name}
            </Typography>
            <Chip
              label={`v${template.version}`}
              size="small"
              color="primary"
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {template.description}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Rating value={template.rating} readOnly size="small" sx={{ mr: 1 }} />
            <Typography variant="caption" color="text.secondary">
              ({template.downloads} downloads)
            </Typography>
          </Box>

          <Typography variant="caption" color="text.secondary" display="block">
            Created: {new Date(template.createdAt).toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Updated: {new Date(template.updatedAt).toLocaleDateString()}
          </Typography>
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Box>
            <IconButton size="small" onClick={() => setPreviewDialog(template)}>
              <PreviewIcon />
            </IconButton>
            <IconButton size="small">
              <EditIcon />
            </IconButton>
            <IconButton size="small" color="error">
              <DeleteIcon />
            </IconButton>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ShareIcon />}
            onClick={() => setShareDialog(template)}
          >
            Share
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Workflow Templates
        </Typography>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => setCreateDialog(true)}
        >
          Create Template
        </Button>
      </Box>

      {/* Tabs */}
      <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Browse Templates" />
        <Tab label={`My Templates ${myTemplates.length > 0 ? `(${myTemplates.length})` : ''}`} />
        <Tab label={`Favorites ${favorites.length > 0 ? `(${favorites.length})` : ''}`} />
      </Tabs>

      {selectedTab === 0 && (
        <Box>
          {/* Filters and Search */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="popular">Most Popular</MenuItem>
                <MenuItem value="rating">Highest Rated</MenuItem>
                <MenuItem value="newest">Newest</MenuItem>
                <MenuItem value="name">Name</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Templates Grid */}
          <Grid container spacing={3}>
            {loading ? (
              Array.from({ length: 9 }).map((_, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card>
                    <CardContent>
                      <Skeleton variant="text" width="80%" height={32} />
                      <Skeleton variant="text" width="100%" />
                      <Skeleton variant="text" width="60%" />
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Skeleton variant="rectangular" width={60} height={24} />
                        <Skeleton variant="rectangular" width={80} height={24} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              sortedTemplates.map(renderTemplateCard)
            )}
          </Grid>
        </Box>
      )}

      {selectedTab === 1 && (
        <Grid container spacing={3}>
          {myTemplates.map(renderMyTemplateCard)}
        </Grid>
      )}

      {selectedTab === 2 && (
        <Grid container spacing={3}>
          {favorites.map(renderTemplateCard)}
        </Grid>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewDialog} onClose={() => setPreviewDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          {previewDialog?.name}
          <Typography variant="body2" color="text.secondary">
            by {previewDialog?.author.name}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>
            {previewDialog?.description}
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Template Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Category:</strong> {previewDialog?.category}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Complexity:</strong> {previewDialog?.preview.complexity}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Nodes:</strong> {previewDialog?.preview.nodes}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Est. Time:</strong> {previewDialog?.preview.estimatedTime}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Tags
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {previewDialog?.tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" />
              ))}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Rating
              value={previewDialog?.rating || 0}
              onChange={(_, newValue) => {
                if (previewDialog && newValue) {
                  handleRateTemplate(previewDialog.id, newValue);
                }
              }}
            />
            <Typography variant="body2">
              Rate this template
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(null)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<InstallIcon />}
            onClick={() => {
              if (previewDialog) {
                setInstallDialog(previewDialog);
                setPreviewDialog(null);
              }
            }}
          >
            Install
          </Button>
        </DialogActions>
      </Dialog>

      {/* Install Dialog */}
      <Dialog open={!!installDialog} onClose={() => setInstallDialog(null)}>
        <DialogTitle>Install Template</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Install "{installDialog?.name}" as a new workflow?
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Workflow Name"
            fullWidth
            variant="outlined"
            defaultValue={installDialog?.name}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallDialog(null)}>Cancel</Button>
          <Button
            onClick={() => installDialog && handleInstallTemplate(installDialog)}
            variant="contained"
          >
            Install
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Template</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Template Name"
            fullWidth
            variant="outlined"
            value={newTemplate.name}
            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newTemplate.description}
            onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={newTemplate.category}
              label="Category"
              onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
            >
              {categories.slice(1).map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Tags (comma separated)"
            fullWidth
            variant="outlined"
            onChange={(e) => {
              const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
              setNewTemplate({ ...newTemplate, tags });
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateTemplate} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
