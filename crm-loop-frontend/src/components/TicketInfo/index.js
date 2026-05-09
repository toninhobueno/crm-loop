import React, { useState, useContext, useEffect } from "react";
import { i18n } from "../../translate/i18n";
import { 
    Avatar, 
    CardHeader, 
    Grid,
    Dialog,
    DialogContent,
    DialogActions,
    DialogTitle,
    IconButton,
    Typography,
    Divider,
    Box,
    TextField,
    Button,
    CircularProgress,
    Tabs,
    Tab,
    Switch,
    Tooltip,
    Paper,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemIcon,
    ListItemSecondaryAction,
    Badge,
    Chip,
    InputAdornment,
    Collapse,
    Link,
    InputLabel,
} from "@material-ui/core";
import InfoIcon from "@material-ui/icons/Info";
import CloseIcon from "@material-ui/icons/Close";
import SaveIcon from "@material-ui/icons/Save";
import EditIcon from "@material-ui/icons/Edit";
import CreateIcon from '@material-ui/icons/Create';
import BlockIcon from '@material-ui/icons/Block';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import SearchIcon from '@material-ui/icons/Search';
import ClearIcon from '@material-ui/icons/Clear';
import ImageIcon from '@material-ui/icons/Image';
import VideocamIcon from '@material-ui/icons/Videocam';
import AudiotrackIcon from '@material-ui/icons/Audiotrack';
import InsertDriveFileIcon from '@material-ui/icons/InsertDriveFile';
import LinkIcon from '@material-ui/icons/Link';
import GroupIcon from "@material-ui/icons/Group";
import PermIdentityIcon from '@material-ui/icons/PermIdentity';
import PersonIcon from "@material-ui/icons/Person";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { AuthContext } from "../../context/Auth/AuthContext";
import formatSerializedId from '../../utils/formatSerializedId';
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { ContactForm } from "../ContactForm";
import ContactModal from "../ContactModal";
import { ContactNotes } from "../ContactNotes";
import { TagsKanbanContainer } from "../TagsKanbanContainer";
import MarkdownWrapper from "../MarkdownWrapper";
import useCompanySettings from "../../hooks/useSettings/companySettings";

const useStyles = makeStyles((theme) => ({
    imageModal: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    imageModalContent: {
        outline: "none",
        maxWidth: "90vw",
        maxHeight: "90vh",
    },
    expandedImage: {
        width: "100%",
        height: "auto",
        maxWidth: "500px",
        borderRadius: theme.spacing(1),
    },
    clickableAvatar: {
        cursor: "pointer",
        "&:hover": {
            opacity: 0.8,
        },
    },
    infoIcon: {
        marginLeft: theme.spacing(1),
        cursor: "pointer",
        color: theme.palette.primary.main,
    },
    contactModal: {
        padding: 0,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
    },
    dialogTitle: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: theme.spacing(1, 1.5),
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        position: "sticky",
        top: 0,
        zIndex: 10,
        minHeight: "48px",
    },
    dialogTitleText: {
        fontSize: "0.95rem",
        fontWeight: 500,
        flex: 1,
    },
    closeButton: {
        padding: theme.spacing(0.5),
        marginLeft: theme.spacing(1),
    },
    contactHeader: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        padding: theme.spacing(1.5, 2),
        backgroundColor: theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`,
        gap: theme.spacing(1.5),
    },
    contactAvatar: {
        width: 46,
        height: 46,
        cursor: "pointer",
        border: `2px solid ${theme.palette.primary.main}`,
        boxShadow: theme.shadows[1],
        flexShrink: 0,
        "&:hover": {
            opacity: 0.9,
            transform: "scale(1.05)",
            transition: "transform 0.2s",
        },
    },
    contactInfo: {
        flex: 1,
        textAlign: "left",
        minWidth: 0,
    },
    contactName: {
        fontWeight: 600,
        marginBottom: theme.spacing(0.25),
        fontSize: "1rem",
    },
    contactDetails: {
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(0.5),
        marginTop: theme.spacing(1),
    },
    infoRow: {
        marginBottom: theme.spacing(1),
    },
    infoLabel: {
        fontWeight: "bold",
        marginRight: theme.spacing(1),
    },
    textField: {
        marginBottom: theme.spacing(2),
    },
    buttonContainer: {
        display: "flex",
        justifyContent: "flex-end",
        gap: theme.spacing(1),
        marginTop: theme.spacing(2),
    },
    editButton: {
        marginLeft: theme.spacing(1),
    },
    switchContainer: {
        padding: theme.spacing(1.5, 2),
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    tabsContainer: {
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        position: "sticky",
        top: 0,
        zIndex: 9,
    },
    tabPanel: {
        padding: theme.spacing(2),
        minHeight: "200px",
        maxHeight: "calc(90vh - 420px)",
        overflow: "auto",
    },
    contactActions: {
        display: "flex",
        gap: theme.spacing(0.5),
        justifyContent: "flex-end",
        alignItems: "center",
        flexShrink: 0,
        marginLeft: "auto",
    },
    actionIcon: {
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.shadows[1],
        "&:hover": {
            backgroundColor: theme.palette.action.hover,
            transform: "translateY(-2px)",
            boxShadow: theme.shadows[3],
            transition: "all 0.2s",
        },
    },
    editIcon: {
        color: theme.palette.primary.main,
    },
    blockIcon: {
        color: theme.palette.error.main,
    },
    unblockIcon: {
        color: theme.palette.success.main,
    },
    mediaGrid: {
        padding: theme.spacing(1),
    },
    mediaItem: {
        cursor: "pointer",
        transition: "transform 0.2s",
        "&:hover": {
            transform: "scale(1.05)",
        },
        borderRadius: theme.spacing(1),
        overflow: "hidden",
        height: 100,
        backgroundColor: theme.palette.action.hover,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    mediaThumbnail: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    mediaIcon: {
        fontSize: 40,
        color: theme.palette.text.secondary,
    },
    searchContainer: {
        padding: theme.spacing(1.5, 2),
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
    },
    searchField: {
        "& .MuiOutlinedInput-root": {
            height: 40,
        }
    },
    searchResults: {
        maxHeight: 200,
        overflow: "auto",
    },
    searchResultItem: {
        padding: theme.spacing(1),
        cursor: "pointer",
        "&:hover": {
            backgroundColor: theme.palette.action.hover,
        },
        borderBottom: `1px solid ${theme.palette.divider}`,
    },
    emptyState: {
        textAlign: "center",
        padding: theme.spacing(3),
        color: theme.palette.text.secondary,
    },
    linkItem: {
        padding: theme.spacing(1),
        "&:hover": {
            backgroundColor: theme.palette.action.hover,
        },
        borderRadius: theme.spacing(0.5),
        marginBottom: theme.spacing(0.5),
    },
    tabChip: {
        minHeight: 16,
        height: 16,
        fontSize: "0.7rem",
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        marginLeft: 4,
    },
    contactDetails: {
        marginTop: theme.spacing(2),
        padding: theme.spacing(2),
        borderRadius: theme.spacing(1),
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        "&:not(:last-child)": {
            marginBottom: theme.spacing(2),
        },
    },
    contactExtraInfo: {
        marginTop: theme.spacing(1),
        padding: theme.spacing(1.5),
        borderRadius: theme.spacing(0.5),
        backgroundColor: theme.palette.action.hover,
        border: `1px solid ${theme.palette.divider}`,
    },
    sectionTitle: {
        fontWeight: 600,
        marginBottom: theme.spacing(1.5),
        fontSize: "0.95rem",
        color: theme.palette.text.primary,
    },
    participantsList: {
        padding: 0,
    },
    participantItem: {
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
        marginBottom: theme.spacing(0.5),
        borderRadius: theme.spacing(1),
        "&:hover": {
            backgroundColor: theme.palette.action.hover,
        },
    },
    participantAvatar: {
        width: 45,
        height: 45,
    },
    adminIcon: {
        color: theme.palette.warning.main,
        fontSize: 16,
    },
    superAdminIcon: {
        color: theme.palette.error.main,
        fontSize: 16,
    },
}));

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`contact-tabpanel-${index}`}
            aria-labelledby={`contact-tab-${index}`}
            {...other}
        >
            {value === index && <div className={props.classes?.tabPanel}>{children}</div>}
        </div>
    );
}

const TicketInfo = ({ contact, ticket, onClick }) => {
    const classes = useStyles();
    const theme = useTheme();
    const { user } = useContext(AuthContext);
    const { get } = useCompanySettings();
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [contactModalOpen, setContactModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tabValue, setTabValue] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [acceptAudioMessage, setAcceptAudio] = useState(contact?.acceptAudioMessage || false);
    const [hideNum, setHideNum] = useState(false);
    const [mediaData, setMediaData] = useState({ images: [], videos: [], audios: [], documents: [], links: [] });
    const [loadingMedia, setLoadingMedia] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [loadingParticipants, setLoadingParticipants] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState(null);
    const [extraInfoModalOpen, setExtraInfoModalOpen] = useState(false);
    
    const [editedContact, setEditedContact] = useState({
        name: "",
        email: "",
        lid: "",
    });

    useEffect(() => {
        async function fetchData() {
            const lgpdHideNumber = await get({ "column": "lgpdHideNumber" });
            if (lgpdHideNumber === "enabled") setHideNum(true);
        }
        fetchData();
    }, []);

    useEffect(() => {
        if (contact && contactModalOpen) {
            setEditedContact({
                name: contact.name || "",
                email: contact.email || "",
                lid: contact.lid || "",
            });
            setIsEditing(false);
            setAcceptAudio(contact.acceptAudioMessage || false);
            setTabValue(0);
            setSearchTerm("");
            setSearchResults([]);
            setShowSearchResults(false);
            setParticipants([]);
            
            if (contact.id) {
                fetchMediaData();
                if (contact.isGroup) {
                    fetchGroupParticipants();
                }
            }
        }
    }, [contact, contactModalOpen]);

    const fetchMediaData = async () => {
        if (!contact?.id) return;
        setLoadingMedia(true);
        try {
            const { data } = await api.get(`/contacts/${contact.id}/media`);
            const processedData = {
                images: data.images.map(item => ({
                    ...item,
                    mediaUrl: item.mediaUrl && !item.mediaUrl.startsWith('http')
                        ? `${process.env.REACT_APP_BACKEND_URL}${item.mediaUrl}`
                        : item.mediaUrl
                })),
                videos: data.videos.map(item => ({
                    ...item,
                    mediaUrl: item.mediaUrl && !item.mediaUrl.startsWith('http')
                        ? `${process.env.REACT_APP_BACKEND_URL}${item.mediaUrl}`
                        : item.mediaUrl
                })),
                audios: data.audios.map(item => ({
                    ...item,
                    mediaUrl: item.mediaUrl && !item.mediaUrl.startsWith('http')
                        ? `${process.env.REACT_APP_BACKEND_URL}${item.mediaUrl}`
                        : item.mediaUrl
                })),
                documents: data.documents.map(item => ({
                    ...item,
                    mediaUrl: item.mediaUrl && !item.mediaUrl.startsWith('http')
                        ? `${process.env.REACT_APP_BACKEND_URL}${item.mediaUrl}`
                        : item.mediaUrl
                })),
                links: data.links
            };
            setMediaData(processedData);
        } catch (err) {
            toastError(err);
            setMediaData({ images: [], videos: [], audios: [], documents: [], links: [] });
        } finally {
            setLoadingMedia(false);
        }
    };

    const fetchGroupParticipants = async () => {
        if (!contact?.isGroup || !contact?.id) return;
        setLoadingParticipants(true);
        try {
            const { data } = await api.get(`/contacts/${contact.id}/participants`);
            setParticipants(data);
        } catch (err) {
            console.error("Erro ao buscar participantes:", err);
            setParticipants([]);
        } finally {
            setLoadingParticipants(false);
        }
    };

    const searchMessages = async (searchParam) => {
        if (!searchParam || searchParam.trim().length < 2 || !contact?.id) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }
        setSearchLoading(true);
        try {
            const { data } = await api.get(`/contacts/${contact.id}/messages/search`, {
                params: { searchParam: searchParam.trim() }
            });
            setSearchResults(data.messages || []);
            setShowSearchResults(true);
        } catch (err) {
            toastError(err);
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSearchChange = (event) => {
        const value = event.target.value;
        setSearchTerm(value);
        if (searchTimeout) clearTimeout(searchTimeout);
        const newTimeout = setTimeout(() => {
            searchMessages(value);
        }, 500);
        setSearchTimeout(newTimeout);
    };

    const clearSearch = () => {
        setSearchTerm("");
        setSearchResults([]);
        setShowSearchResults(false);
        if (searchTimeout) clearTimeout(searchTimeout);
    };

    const highlightSearchTerm = (text) => {
        if (!searchTerm || !text) return text;
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    };

    const handleImageClick = (e) => {
        e.stopPropagation();
        if (contact?.urlPicture) {
            setImageModalOpen(true);
        }
    };

    const handleImageModalClose = () => {
        setImageModalOpen(false);
    };

    const handleFieldChange = (field, value) => {
        setEditedContact(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSave = async () => {
        if (!contact?.id) return;
        setLoading(true);
        try {
            await api.put(`/contacts/${contact.id}`, {
                name: editedContact.name,
                email: editedContact.email || null,
                lid: editedContact.lid || null,
            });
            toast.success("Informações atualizadas com sucesso!");
            setIsEditing(false);
            if (onClick) onClick();
        } catch (err) {
            toastError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setEditedContact({
            name: contact?.name || "",
            email: contact?.email || "",
            lid: contact?.lid || "",
        });
        setIsEditing(false);
    };

    const handleContactToggleAcceptAudio = async () => {
        if (!ticket?.contact?.id) return;
        try {
            const { data } = await api.put(`/contacts/toggleAcceptAudio/${ticket.contact.id}`);
            setAcceptAudio(data.acceptAudioMessage);
        } catch (err) {
            toastError(err);
        }
    };

    const handleBlockContact = async (contactId) => {
        try {
            await api.put(`/contacts/block/${contactId}`, { active: false });
            toast.success("Contato bloqueado");
        } catch (err) {
            toastError(err);
        }
    };

    const handleUnBlockContact = async (contactId) => {
        try {
            await api.put(`/contacts/block/${contactId}`, { active: true });
            toast.success("Contato desbloqueado");
        } catch (err) {
            toastError(err);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        if (newValue !== 0) clearSearch();
    };

    const renderCardReader = () => {
        return (
            <div style={{ display: 'flex', alignItems: 'center' }}>
            <CardHeader
                titleTypographyProps={{ noWrap: true }}
                subheaderTypographyProps={{ noWrap: true }}
                avatar={
                    <Avatar 
                        src={contact?.urlPicture} 
                        alt="contact_image" 
                        className={classes.clickableAvatar}
                        onClick={handleImageClick}
                    />
                }
                title={`${(contact?.name && contact.name.length > 12) ? 
                    `${contact.name.substring(0, 12)}...` : 
                    contact?.name || '(sem contato)'} #${ticket?.id}`}
                subheader={[
                    ticket?.user && `${i18n.t("messagesList.header.assignedTo")} ${ticket?.user?.name}`,
                    contact?.contactWallets && contact.contactWallets.length > 0
                        ? `• ${i18n.t("wallets.wallet")}: ${contact.contactWallets[0].wallet?.name || 'N/A'}`
                        : null
                ].filter(Boolean).join(' ')}
            />
                <IconButton
                    size="small"
                    className={classes.infoIcon}
                    onClick={() => setContactModalOpen(true)}
                >
                    <InfoIcon />
                </IconButton>
            </div>
        );
    };

    const renderMediaGrid = (items, type) => {
        if (items.length === 0) {
            return (
                <div className={classes.emptyState}>
                    <Typography variant="body2">
                        {type === "images" && "Nenhuma imagem encontrada"}
                        {type === "videos" && "Nenhum vídeo encontrado"}
                        {type === "audios" && "Nenhum áudio encontrado"}
                    </Typography>
                </div>
            );
        }
        return (
            <Grid container spacing={1} className={classes.mediaGrid}>
                {items.map((item, index) => (
                    <Grid item xs={4} key={index}>
                        <Paper
                            className={classes.mediaItem}
                            elevation={1}
                            onClick={() => window.open(item.mediaUrl, '_blank')}
                        >
                            {type === "images" && (
                                <img src={item.mediaUrl} alt="" className={classes.mediaThumbnail} />
                            )}
                            {type === "videos" && (
                                <Box display="flex" flexDirection="column" alignItems="center">
                                    <VideocamIcon className={classes.mediaIcon} />
                                    <Typography variant="caption" style={{ marginTop: 4 }}>
                                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                                    </Typography>
                                </Box>
                            )}
                            {type === "audios" && (
                                <Box display="flex" flexDirection="column" alignItems="center">
                                    <AudiotrackIcon className={classes.mediaIcon} />
                                    <Typography variant="caption" style={{ marginTop: 4 }}>
                                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        );
    };

    const renderParticipants = () => {
        if (loadingParticipants) {
            return (
                <div className={classes.emptyState}>
                    <CircularProgress size={40} />
                </div>
            );
        }
        if (participants.length === 0) {
            return (
                <div className={classes.emptyState}>
                    <Typography variant="body2">Nenhum participante encontrado</Typography>
                </div>
            );
        }
        return (
            <List className={classes.participantsList}>
                {participants.map((participant) => (
                    <ListItem key={participant.id} className={classes.participantItem}>
                        <ListItemAvatar>
                            <Badge
                                overlap="circular"
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                badgeContent={
                                    participant.isSuperAdmin ? (
                                        <PermIdentityIcon className={classes.superAdminIcon} />
                                    ) : participant.isAdmin ? (
                                        <PermIdentityIcon className={classes.adminIcon} />
                                    ) : null
                                }
                            >
                                <Avatar src={participant.profilePicUrl} alt={participant.name} className={classes.participantAvatar}>
                                    {participant.name?.charAt(0)?.toUpperCase()}
                                </Avatar>
                            </Badge>
                        </ListItemAvatar>
                        <ListItemText
                            primary={<Typography variant="subtitle2" noWrap>{participant.name}</Typography>}
                            secondary={<Typography variant="caption" color="textSecondary" noWrap>
                                {formatSerializedId(participant.number)}
                            </Typography>}
                        />
                    </ListItem>
                ))}
            </List>
        );
    };

    const renderSearchResults = () => {
        if (searchLoading) {
            return (
                <div className={classes.emptyState}>
                    <CircularProgress size={20} />
                </div>
            );
        }
        if (searchResults.length === 0 && searchTerm.length >= 2) {
            return (
                <div className={classes.emptyState}>
                    <Typography variant="caption">Nenhuma mensagem encontrada</Typography>
                </div>
            );
        }
        return (
            <div className={classes.searchResults}>
                {searchResults.map((message) => (
                    <div key={message.id} className={classes.searchResultItem}>
                        <Typography
                            variant="body2"
                            dangerouslySetInnerHTML={{
                                __html: highlightSearchTerm(message.body.substring(0, 100) + (message.body.length > 100 ? "..." : ""))
                            }}
                        />
                        <Typography variant="caption" color="textSecondary">
                            {new Date(message.createdAt).toLocaleString('pt-BR')}
                        </Typography>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <React.Fragment>
            <Grid container alignItems="center" spacing={10}>
                <Grid item xs={6}>
                    {renderCardReader()}
                </Grid>
            </Grid>

            <Dialog
                open={imageModalOpen}
                onClose={handleImageModalClose}
                className={classes.imageModal}
                maxWidth="md"
                fullWidth
            >
                <DialogContent className={classes.imageModalContent}>
                    <img 
                        src={contact?.urlPicture} 
                        alt={contact?.name || "Foto do contato"}
                        className={classes.expandedImage}
                    />
                </DialogContent>
            </Dialog>

            <Dialog
                open={contactModalOpen}
                onClose={() => {
                    handleCancel();
                    setContactModalOpen(false);
                }}
                maxWidth="md"
                fullWidth
                PaperProps={{ style: { maxHeight: "90vh" } }}
            >
                <DialogTitle className={classes.dialogTitle}>
                    <Typography variant="subtitle1" className={classes.dialogTitleText}>
                        {i18n.t("contactDrawer.header")}
                    </Typography>
                    <Box style={{ display: "flex", alignItems: "center" }}>
                        <Box className={classes.switchContainer} style={{ borderBottom: 'none', padding: 0, marginRight: 16, backgroundColor: 'transparent' }}>
                            <Typography variant="body2" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Switch
                                    size="small"
                                    checked={acceptAudioMessage}
                                    onChange={handleContactToggleAcceptAudio}
                                    color="primary"
                                />
                                {i18n.t("ticketOptionsMenu.acceptAudioMessage")}
                            </Typography>
                        </Box>
                        <IconButton 
                            onClick={() => {
                                handleCancel();
                                setContactModalOpen(false);
                            }}
                            className={classes.closeButton}
                            size="small"
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <Box className={classes.contactHeader}>
                    <Avatar 
                        src={contact?.urlPicture} 
                        alt={contact?.name}
                        className={classes.contactAvatar}
                        onClick={handleImageClick}
                    >
                        {editedContact.name?.charAt(0)?.toUpperCase() || contact?.name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <Box className={classes.contactInfo}>
                        {isEditing ? (
                            <TextField
                                fullWidth
                                variant="outlined"
                                size="small"
                                value={editedContact.name}
                                onChange={(e) => handleFieldChange("name", e.target.value)}
                                label="Nome"
                                style={{ marginBottom: theme.spacing(1.5) }}
                            />
                        ) : (
                            <Typography variant="h6" className={classes.contactName}>
                                {editedContact.name || contact?.name || 'Sem nome'}
                            </Typography>
                        )}
                        <Box style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
                            <Typography variant="caption" color="textSecondary" style={{ fontSize: "0.75rem" }}>
                                {hideNum && user.profile === "user"
                                    ? formatSerializedId(contact?.number || "").slice(0, -6) + "**-**" + (contact?.number || "").slice(-2)
                                    : formatSerializedId(contact?.number || "")}
                            </Typography>
                            {contact?.lid && (
                                <Typography variant="caption" color="textSecondary" style={{ fontSize: "0.75rem" }}>
                                    LID: {contact.lid}
                                </Typography>
                            )}
                            {contact?.email && (
                                <Typography variant="caption" style={{ fontSize: "0.75rem" }}>
                                    <Link href={`mailto:${contact.email}`} color="primary">
                                        {contact.email}
                                    </Link>
                                </Typography>
                            )}
                        </Box>
                    </Box>
                    <Box className={classes.contactActions}>
                        <Tooltip title={i18n.t("contactDrawer.buttons.edit")} arrow>
                            <IconButton
                                className={`${classes.actionIcon} ${classes.editIcon}`}
                                onClick={() => setExtraInfoModalOpen(true)}
                                size="small"
                                style={{ padding: theme.spacing(0.5) }}
                            >
                                <CreateIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={!contact?.active ? "Desbloquear contato" : "Bloquear contato"} arrow>
                            <IconButton
                                className={`${classes.actionIcon} ${!contact?.active ? classes.unblockIcon : classes.blockIcon}`}
                                onClick={() => contact?.active
                                    ? handleBlockContact(contact.id)
                                    : handleUnBlockContact(contact.id)}
                                size="small"
                                style={{ padding: theme.spacing(0.5) }}
                            >
                                {!contact?.active ? <LockOpenIcon fontSize="small" /> : <BlockIcon fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                <Box className={classes.searchContainer}>
                    <TextField
                        className={classes.searchField}
                        fullWidth
                        size="small"
                        variant="outlined"
                        placeholder="Pesquisar nas mensagens..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                            endAdornment: searchTerm && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={clearSearch} edge="end">
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Collapse in={showSearchResults}>
                        <Paper variant="outlined" style={{ marginTop: 8 }}>
                            {renderSearchResults()}
                        </Paper>
                    </Collapse>
                </Box>

                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    className={classes.tabsContainer}
                >
                    <Tab icon={<InfoIcon />} aria-label="Informações" />
                    <Tab
                        icon={
                            <Box display="flex" alignItems="center">
                                <ImageIcon />
                                {mediaData.images.length > 0 && (
                                    <Chip size="small" label={mediaData.images.length} className={classes.tabChip} />
                                )}
                            </Box>
                        }
                        aria-label="Imagens"
                    />
                    <Tab
                        icon={
                            <Box display="flex" alignItems="center">
                                <VideocamIcon />
                                {mediaData.videos.length > 0 && (
                                    <Chip size="small" label={mediaData.videos.length} className={classes.tabChip} />
                                )}
                            </Box>
                        }
                        aria-label="Vídeos"
                    />
                    <Tab
                        icon={
                            <Box display="flex" alignItems="center">
                                <AudiotrackIcon />
                                {mediaData.audios.length > 0 && (
                                    <Chip size="small" label={mediaData.audios.length} className={classes.tabChip} />
                                )}
                            </Box>
                        }
                        aria-label="Áudios"
                    />
                    <Tab
                        icon={
                            <Box display="flex" alignItems="center">
                                <InsertDriveFileIcon />
                                {mediaData.documents.length > 0 && (
                                    <Chip size="small" label={mediaData.documents.length} className={classes.tabChip} />
                                )}
                            </Box>
                        }
                        aria-label="Documentos"
                    />
                    <Tab
                        icon={
                            <Box display="flex" alignItems="center">
                                <LinkIcon />
                                {mediaData.links.length > 0 && (
                                    <Chip size="small" label={mediaData.links.length} className={classes.tabChip} />
                                )}
                            </Box>
                        }
                        aria-label="Links"
                    />
                    {contact?.isGroup && (
                        <Tab
                            icon={
                                <Box display="flex" alignItems="center">
                                    <GroupIcon />
                                    {participants.length > 0 && (
                                        <Chip size="small" label={participants.length} className={classes.tabChip} />
                                    )}
                                </Box>
                            }
                            aria-label="Participantes"
                        />
                    )}
                </Tabs>

                <DialogContent className={classes.contactModal}>
                    <TabPanel value={tabValue} index={0} classes={classes}>
                        {ticket && (
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={4}>
                                    <Paper className={classes.contactDetails}>
                                        <Typography variant="subtitle2" className={classes.sectionTitle}>
                                            Etapa Kanban
                                        </Typography>
                                        <TagsKanbanContainer ticket={ticket} />
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} md={8}>
                                    <Paper className={classes.contactDetails}>
                                        <Typography variant="subtitle2" className={classes.sectionTitle}>
                                            {i18n.t("ticketOptionsMenu.appointmentsModal.title")}
                                        </Typography>
                                        <ContactNotes ticket={ticket} />
                                    </Paper>
                                </Grid>
                            </Grid>
                        )}

                    </TabPanel>

                    <TabPanel value={tabValue} index={1} classes={classes}>
                        {loadingMedia ? (
                            <div className={classes.emptyState}>
                                <CircularProgress />
                            </div>
                        ) : (
                            renderMediaGrid(mediaData.images, "images")
                        )}
                    </TabPanel>

                    <TabPanel value={tabValue} index={2} classes={classes}>
                        {loadingMedia ? (
                            <div className={classes.emptyState}>
                                <CircularProgress />
                            </div>
                        ) : (
                            renderMediaGrid(mediaData.videos, "videos")
                        )}
                    </TabPanel>

                    <TabPanel value={tabValue} index={3} classes={classes}>
                        {loadingMedia ? (
                            <div className={classes.emptyState}>
                                <CircularProgress />
                            </div>
                        ) : (
                            renderMediaGrid(mediaData.audios, "audios")
                        )}
                    </TabPanel>

                    <TabPanel value={tabValue} index={4} classes={classes}>
                        {loadingMedia ? (
                            <div className={classes.emptyState}>
                                <CircularProgress />
                            </div>
                        ) : mediaData.documents.length === 0 ? (
                            <div className={classes.emptyState}>
                                <Typography variant="body2">Nenhum documento encontrado</Typography>
                            </div>
                        ) : (
                            <List>
                                {mediaData.documents.map((doc, index) => (
                                    <ListItem
                                        key={index}
                                        button
                                        className={classes.linkItem}
                                        onClick={() => window.open(doc.mediaUrl, '_blank')}
                                    >
                                        <ListItemIcon>
                                            <InsertDriveFileIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={doc.body || `Documento ${index + 1}`}
                                            secondary={new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </TabPanel>

                    <TabPanel value={tabValue} index={5} classes={classes}>
                        {loadingMedia ? (
                            <div className={classes.emptyState}>
                                <CircularProgress />
                            </div>
                        ) : mediaData.links.length === 0 ? (
                            <div className={classes.emptyState}>
                                <Typography variant="body2">Nenhum link encontrado</Typography>
                            </div>
                        ) : (
                            <List>
                                {mediaData.links.map((link, index) => (
                                    <ListItem
                                        key={index}
                                        button
                                        className={classes.linkItem}
                                        onClick={() => window.open(link.url, '_blank')}
                                    >
                                        <ListItemIcon>
                                            <LinkIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={link.title || link.url}
                                            secondary={new Date(link.createdAt).toLocaleDateString('pt-BR')}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </TabPanel>

                    {contact?.isGroup && (
                        <TabPanel value={tabValue} index={6} classes={classes}>
                            <Typography variant="h6" style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
                                <GroupIcon style={{ marginRight: 8 }} />
                                Participantes do Grupo ({participants.length})
                            </Typography>
                            {renderParticipants()}
                        </TabPanel>
                    )}
                </DialogContent>

                <ContactModal
                    open={extraInfoModalOpen}
                    onClose={async () => {
                        setExtraInfoModalOpen(false);
                        // Atualizar dados do contato após fechar o modal
                        if (contact?.id && onClick) {
                            try {
                                const { data } = await api.get(`/contacts/${contact.id}`);
                                // O socket também atualizará automaticamente
                                if (onClick) onClick();
                            } catch (err) {
                                console.error('Erro ao atualizar contato:', err);
                            }
                        }
                    }}
                    contactId={contact?.id}
                />

                {isEditing && (
                    <DialogActions className={classes.buttonContainer}>
                        <Button onClick={handleCancel} color="secondary" disabled={loading}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            variant="contained"
                            color="primary"
                            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                            disabled={loading}
                        >
                            Salvar
                        </Button>
                    </DialogActions>
                )}
            </Dialog>
        </React.Fragment>
    );
};

export default TicketInfo;
