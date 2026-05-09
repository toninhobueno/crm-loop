import React, { useState, useContext, useEffect, useRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Hidden from "@material-ui/core/Hidden";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import ColorModeContext from "../../layout/themeContext";
import useSettings from "../../hooks/useSettings";
import IconButton from "@material-ui/core/IconButton";
import Brightness4Icon from "@material-ui/icons/Brightness4";
import Brightness7Icon from "@material-ui/icons/Brightness7";
import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";
import InputAdornment from "@material-ui/core/InputAdornment";
import { Helmet } from "react-helmet";
import { toast } from "react-toastify";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import BRFlag from "../../assets/brazil.png";
import USFlag from "../../assets/unitedstates.png";
import ESFlag from "../../assets/esspain.png";
import ARFlag from "../../assets/arabe.png";
import { getNumberSupport } from "../../config";
import packageJson from "../../../package.json";

const languageOptions = [
    { value: "pt-BR", label: "Português", icon: BRFlag },
    { value: "en", label: "English", icon: USFlag },
    { value: "es", label: "Spanish", icon: ESFlag },
    { value: "ar", label: "عربي", icon: ARFlag },
];

const useStyles = makeStyles((theme) => {
    const isDark = theme.palette.type === "dark";
    const primary = theme.palette.primary.main;
    return {
        pageRoot: {
            display: "flex",
            width: "100%",
            minHeight: "100vh",
            overflow: "auto",
            position: "relative",
            [theme.breakpoints.down("sm")]: {
                flexDirection: "column",
            },
        },
        heroColumn: {
            display: "none",
            position: "relative",
            flex: "1 1 44%",
            minHeight: 560,
            overflow: "hidden",
            padding: theme.spacing(6, 5),
            flexDirection: "column",
            justifyContent: "space-between",
            background: `linear-gradient(155deg, #050a12 0%, #0c1220 38%, #0f172a 72%, ${primary}22 100%)`,
            [theme.breakpoints.up("md")]: {
                display: "flex",
            },
        },
        heroGlow1: {
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${primary}55 0%, transparent 70%)`,
            top: "-120px",
            right: "-80px",
            filter: "blur(2px)",
            pointerEvents: "none",
        },
        heroGlow2: {
            position: "absolute",
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,197,94,0.35) 0%, transparent 70%)",
            bottom: "10%",
            left: "-100px",
            pointerEvents: "none",
        },
        heroGrid: {
            position: "absolute",
            inset: 0,
            opacity: 0.07,
            backgroundImage: `
        linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)
      `,
            backgroundSize: "48px 48px",
            pointerEvents: "none",
        },
        brandLabel: {
            color: "rgba(255,255,255,0.88)",
            fontWeight: 700,
            fontSize: "1.75rem",
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
            zIndex: 1,
        },
        tagline: {
            color: primary,
            fontWeight: 600,
            fontSize: "0.82rem",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            marginTop: theme.spacing(1),
        },
        trustPill: {
            display: "inline-flex",
            alignItems: "center",
            marginTop: theme.spacing(2),
            padding: "6px 14px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.92)",
            fontSize: "0.85rem",
            fontWeight: 500,
        },
        heroTitle: {
            color: "#fff",
            fontWeight: 800,
            fontSize: "clamp(1.65rem, 2.2vw, 2.25rem)",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            marginTop: theme.spacing(2),
            maxWidth: 420,
            zIndex: 1,
        },
        heroSub: {
            color: "rgba(255,255,255,0.72)",
            fontSize: "1rem",
            lineHeight: 1.65,
            marginTop: theme.spacing(2),
            maxWidth: 440,
            zIndex: 1,
        },
        chipRow: {
            display: "flex",
            flexWrap: "wrap",
            gap: theme.spacing(1),
            marginTop: theme.spacing(3),
            zIndex: 1,
        },
        chip: {
            padding: "8px 14px",
            borderRadius: 10,
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "rgba(255,255,255,0.95)",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(8px)",
        },
        quoteCard: {
            position: "relative",
            zIndex: 1,
            marginTop: theme.spacing(4),
            padding: theme.spacing(2.5, 2.5),
            borderRadius: 16,
            background: "rgba(15,23,42,0.65)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.35)",
        },
        quoteText: {
            color: "rgba(255,255,255,0.92)",
            fontSize: "0.95rem",
            lineHeight: 1.65,
            fontStyle: "italic",
        },
        quoteAuthor: {
            marginTop: theme.spacing(2),
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: theme.spacing(1),
        },
        avatarStack: {
            display: "flex",
            alignItems: "center",
        },
        miniAvatar: {
            width: 36,
            height: 36,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "0.75rem",
            color: "#fff",
            border: "2px solid #0f172a",
            marginLeft: -8,
            "&:first-child": { marginLeft: 0 },
        },
        statBlock: {
            textAlign: "right",
        },
        statValue: {
            color: "#4ade80",
            fontWeight: 800,
            fontSize: "1.35rem",
            letterSpacing: "-0.02em",
        },
        statCap: {
            color: "rgba(255,255,255,0.55)",
            fontSize: "0.75rem",
        },
        heroFooter: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: theme.spacing(2),
            zIndex: 1,
            marginTop: theme.spacing(3),
        },
        statMini: {
            color: "rgba(255,255,255,0.85)",
            fontSize: "0.9rem",
            fontWeight: 600,
        },
        stars: {
            color: "#fbbf24",
            fontSize: "0.95rem",
            letterSpacing: 2,
        },
        mobileStrip: {
            display: "block",
            padding: theme.spacing(2.5, 2),
            background: `linear-gradient(120deg, #0f172a 0%, ${primary}33 100%)`,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            [theme.breakpoints.up("md")]: {
                display: "none",
            },
        },
        formColumn: {
            flex: "1 1 56%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: theme.spacing(3, 2, 4),
            minHeight: "100%",
            background: isDark ? "#080c11" : "#f3f5f9",
            [theme.breakpoints.up("md")]: {
                padding: theme.spacing(5, 4, 6),
            },
        },
        formCard: {
            width: "100%",
            maxWidth: 440,
            position: "relative",
            borderRadius: 20,
            padding: theme.spacing(3.5, 3),
            [theme.breakpoints.up("sm")]: {
                padding: theme.spacing(4, 4),
            },
            background: isDark ? "rgba(22,28,36,0.92)" : "rgba(255,255,255,0.96)",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(15,23,42,0.06)",
            boxShadow: isDark
                ? "0 32px 64px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)"
                : "0 28px 56px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
            backdropFilter: "blur(20px)",
        },
        formTopBar: {
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            marginBottom: theme.spacing(1),
        },
        iconButtonSoft: {
            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
            border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(15,23,42,0.08)",
        },
        logoImg: {
            width: "100%",
            maxWidth: 220,
            height: "auto",
            maxHeight: 64,
            marginBottom: theme.spacing(2),
            content:
                "url(" +
                (theme.mode === "light" ? theme.calculatedLogoLight() : theme.calculatedLogoDark()) +
                ")",
        },
        tabRow: {
            display: "flex",
            borderRadius: 12,
            padding: 4,
            marginBottom: theme.spacing(2.5),
            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
        },
        tabActive: {
            flex: 1,
            textAlign: "center",
            padding: "10px 12px",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: "0.9rem",
            color: "#fff",
            background: `linear-gradient(135deg, ${primary}, ${theme.palette.primary.dark})`,
            boxShadow: `0 6px 16px ${primary}44`,
        },
        tabInactive: {
            flex: 1,
            textAlign: "center",
            padding: "10px 12px",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: "0.9rem",
            color: isDark ? "rgba(255,255,255,0.65)" : "rgba(15,23,42,0.55)",
            textDecoration: "none",
            transition: "color 0.2s",
            "&:hover": {
                color: primary,
            },
        },
        welcomeTitle: {
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: isDark ? "#fff" : "#0f172a",
        },
        welcomeSub: {
            marginTop: theme.spacing(0.75),
            color: isDark ? "rgba(255,255,255,0.55)" : "rgba(15,23,42,0.55)",
            fontSize: "0.95rem",
        },
        form: {
            width: "100%",
            marginTop: theme.spacing(2),
        },
        field: {
            marginBottom: theme.spacing(1.5),
            "& .MuiOutlinedInput-root": {
                borderRadius: 12,
                background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.9)",
            },
        },
        rowBetween: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: theme.spacing(0.5),
        },
        forgotLink: {
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
        },
        submit: {
            marginTop: theme.spacing(2),
            padding: "14px 16px",
            borderRadius: 12,
            fontSize: "1rem",
            fontWeight: 700,
            textTransform: "none",
            boxShadow: `0 14px 28px ${primary}55`,
            background: `linear-gradient(135deg, ${primary}, ${theme.palette.primary.dark})`,
            "&:hover": {
                boxShadow: `0 18px 36px ${primary}66`,
            },
        },
        oauthBtn: {
            borderRadius: 12,
            textTransform: "none",
            fontWeight: 600,
            padding: "10px 12px",
            borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.12)",
            color: isDark ? "#e5e7eb" : "#0f172a",
        },
        dividerText: {
            margin: theme.spacing(2.5, 0),
            color: isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.42)",
            fontSize: "0.8rem",
        },
        footerNote: {
            marginTop: theme.spacing(3),
            textAlign: "center",
            fontSize: "0.82rem",
        },
        footerLink: {
            fontWeight: 600,
            color: primary,
        },
        versionPill: {
            marginTop: theme.spacing(1.5),
            textAlign: "center",
            fontSize: "0.75rem",
            color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.35)",
        },
        languageSelector: {
            position: "fixed",
            top: theme.spacing(2),
            left: theme.spacing(2),
            zIndex: 1200,
            background: "rgba(15,23,42,0.55)",
            backdropFilter: "blur(12px)",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            padding: "8px 12px",
        },
        languageDropdown: {
            display: "flex",
            alignItems: "center",
            background: "none",
            border: "none",
            color: "#e5e7eb",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            gap: 8,
        },
        languageOptions: {
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 8,
            background: "rgba(255,255,255,0.98)",
            boxShadow: "0 14px 32px rgba(0,0,0,0.18)",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.06)",
            padding: 8,
            zIndex: 1300,
            minWidth: 150,
        },
        languageOption: {
            background: "none",
            border: "none",
            color: "#111827",
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            "&:hover": {
                background: "rgba(59,130,246,0.08)",
                color: primary,
            },
        },
        flagIcon: {
            width: 20,
            height: 15,
            borderRadius: 2,
        },
        checkLabel: {
            marginLeft: -4,
            "& .MuiTypography-root": {
                fontSize: "0.88rem",
                color: isDark ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.72)",
            },
        },
    };
});

const COLORS_AV = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899"];

const Login = () => {
    const classes = useStyles();
    const theme = useTheme();
    const mdUp = useMediaQuery(theme.breakpoints.up("md"));
    const { colorMode } = useContext(ColorModeContext);
    const { appLogoFavicon, appName, mode } = colorMode;
    const [user, setUser] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(true);
    const [allowSignup, setAllowSignup] = useState(false);
    const { getPublicSetting } = useSettings();
    const { handleLogin } = useContext(AuthContext);

    const [open, setOpen] = useState(false);
    const ref = useRef();
    const [enabledLanguages, setEnabledLanguages] = useState(["pt-BR", "en"]);

    const getCompanyIdFromUrl = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const companyId = urlParams.get("companyId");
        return companyId ? parseInt(companyId, 10) : null;
    };

    const handleChangeInput = (e) => {
        setUser({ ...user, [e.target.name]: e.target.value });
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handlSubmit = (e) => {
        e.preventDefault();
        handleLogin(user);
    };

    const supportDigits = getNumberSupport();
    const helpHref =
        supportDigits && String(supportDigits).replace(/\D/g, "").length >= 8
            ? `https://wa.me/${String(supportDigits).replace(/\D/g, "")}`
            : null;

    useEffect(() => {
        const companyId = getCompanyIdFromUrl();

        getPublicSetting("userCreation", companyId)
            .then((data) => {
                setAllowSignup(data === "enabled");
            })
            .catch(() => {});

        getPublicSetting("enabledLanguages", companyId)
            .then((langs) => {
                let arr = ["pt-BR", "en"];
                try {
                    if (langs) arr = JSON.parse(langs);
                } catch (e) {
                    /* keep default */
                }
                setEnabledLanguages(arr);
            })
            .catch(() => setEnabledLanguages(["pt-BR", "en"]));
    }, []);

    const current =
        languageOptions.find((opt) => opt.value === i18n.language) || languageOptions[0];

    const handleSelect = (opt) => {
        i18n.changeLanguage(opt.value);
        localStorage.setItem("language", opt.value);
        setOpen(false);
        window.location.reload();
    };

    const onSocialClick = (e) => {
        e.preventDefault();
        toast.info(i18n.t("login.buttons.socialUnavailable"));
    };

    const onForgotClick = (e) => {
        e.preventDefault();
        toast.info(i18n.t("login.buttons.forgotToast"));
    };

    const displayName = appName && String(appName).trim() !== "" ? appName : "LOOP";

    const letters = ["A", "B", "C", "D"];

    return (
        <>
            <Helmet>
                <title>{appName || "Multi100"}</title>
                <link rel="icon" href={appLogoFavicon || "/default-favicon.ico"} />
            </Helmet>

            <Box className={classes.pageRoot}>
                <Box ref={ref} className={classes.languageSelector}>
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        className={classes.languageDropdown}
                    >
                        <img src={current.icon} alt={current.label} className={classes.flagIcon} />
                        {current.label}
                        <span>▾</span>
                    </button>
                    {open && (
                        <div className={classes.languageOptions}>
                            {languageOptions
                                .filter((opt) => enabledLanguages.includes(opt.value))
                                .map((opt) => (
                                    <button
                                        type="button"
                                        key={opt.value}
                                        onClick={() => handleSelect(opt)}
                                        className={classes.languageOption}
                                    >
                                        <img
                                            src={opt.icon}
                                            alt={opt.label}
                                            className={classes.flagIcon}
                                        />
                                        {opt.label}
                                    </button>
                                ))}
                        </div>
                    )}
                </Box>

                <Hidden mdUp>
                    <Box className={classes.mobileStrip}>
                        <Typography style={{ color: "#fff", fontWeight: 800, letterSpacing: "-0.02em" }}>
                            {displayName}
                        </Typography>
                        <Typography style={{ color: "rgba(255,255,255,0.8)", marginTop: 8, fontSize: "0.9rem" }}>
                            {i18n.t("login.marketing.headline")}
                        </Typography>
                    </Box>
                </Hidden>

                <Box className={classes.heroColumn}>
                    <Box className={classes.heroGlow1} />
                    <Box className={classes.heroGlow2} />
                    <Box className={classes.heroGrid} />

                    <Box position="relative" zIndex={1}>
                        <Typography className={classes.brandLabel}>{displayName}</Typography>
                        <Typography className={classes.tagline}>{i18n.t("login.marketing.tagline")}</Typography>

                        <Box className={classes.trustPill}>
                            <span style={{ marginRight: 8 }} aria-hidden="true">
                                ✦
                            </span>
                            {i18n.t("login.marketing.trust")}
                        </Box>

                        <Typography className={classes.heroTitle}>
                            {i18n.t("login.marketing.headline")}
                        </Typography>
                        <Typography className={classes.heroSub}>
                            {i18n.t("login.marketing.subheadline")}
                        </Typography>

                        <Box className={classes.chipRow}>
                            <span className={classes.chip}>{i18n.t("login.marketing.b1")}</span>
                            <span className={classes.chip}>{i18n.t("login.marketing.b2")}</span>
                            <span className={classes.chip}>{i18n.t("login.marketing.b3")}</span>
                            <span className={classes.chip}>{i18n.t("login.marketing.b4")}</span>
                        </Box>
                    </Box>

                    <Box className={classes.quoteCard}>
                        <Typography className={classes.quoteText}>
                            “{i18n.t("login.marketing.testimonial")}”
                        </Typography>
                        <Box className={classes.quoteAuthor}>
                            <Box>
                                <Typography style={{ color: "#fff", fontWeight: 700 }}>
                                    {i18n.t("login.marketing.author")}
                                </Typography>
                                <Typography style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>
                                    {i18n.t("login.marketing.role")}
                                </Typography>
                            </Box>
                            <Box className={classes.statBlock}>
                                <Typography className={classes.statValue}>
                                    {i18n.t("login.marketing.statValue")}
                                </Typography>
                                <Typography className={classes.statCap}>{i18n.t("login.marketing.statLabel")}</Typography>
                            </Box>
                        </Box>
                        <Box className={classes.heroFooter} style={{ marginTop: 16, marginBottom: 0 }}>
                            <Box className={classes.avatarStack}>
                                {letters.map((L, idx) => (
                                    <Box
                                        key={L}
                                        className={classes.miniAvatar}
                                        style={{ backgroundColor: COLORS_AV[idx % COLORS_AV.length], zIndex: 4 - idx }}
                                    >
                                        {L}
                                    </Box>
                                ))}
                                <Typography className={classes.statMini} style={{ marginLeft: 12 }}>
                                    {i18n.t("login.marketing.usersCount")} {i18n.t("login.marketing.usersLabel")}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography className={classes.stars}>★★★★★</Typography>
                                <Typography className={classes.statMini}>{i18n.t("login.marketing.rating")}</Typography>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                <Box className={classes.formColumn} component="main">
                    <CssBaseline />
                    <Box className={classes.formCard}>
                        <Box className={classes.formTopBar}>
                            <IconButton size="small" className={classes.iconButtonSoft} onClick={colorMode.toggleColorMode}>
                                {mode === "dark" ? (
                                    <Brightness7Icon htmlColor="#e5e7eb" />
                                ) : (
                                    <Brightness4Icon htmlColor="#334155" />
                                )}
                            </IconButton>
                        </Box>

                        <Box display="flex" justifyContent="flex-start">
                            <img className={classes.logoImg} alt="logo" />
                        </Box>

                        <Typography variant="h5" component="h1" className={classes.welcomeTitle}>
                            {i18n.t("login.welcome")}
                        </Typography>
                        <Typography className={classes.welcomeSub}>{i18n.t("login.loginInstruction")}</Typography>

                        <Box className={classes.tabRow}>
                            <Typography component="span" className={classes.tabActive} style={!allowSignup ? { width: "100%" } : undefined}>
                                {i18n.t("login.title")}
                            </Typography>
                            {allowSignup && (
                                <Typography
                                    component={RouterLink}
                                    to="/signup"
                                    className={classes.tabInactive}
                                    style={{ textDecoration: "none" }}
                                >
                                    {i18n.t("login.buttons.register")}
                                </Typography>
                            )}
                        </Box>

                        <form className={classes.form} noValidate onSubmit={handlSubmit}>
                            <Box className={classes.rowBetween}>
                                <Typography
                                    variant="body2"
                                    style={{
                                        fontWeight: 700,
                                        color:
                                            theme.palette.type === "dark"
                                                ? "rgba(255,255,255,0.92)"
                                                : "rgba(15,23,42,0.88)",
                                    }}
                                >
                                    {i18n.t("login.form.email")}
                                </Typography>
                                <Link
                                    component="button"
                                    variant="caption"
                                    className={classes.forgotLink}
                                    style={{ color: theme.palette.primary.main }}
                                    type="button"
                                    onClick={onForgotClick}
                                >
                                    {i18n.t("login.form.forgotPassword")}
                                </Link>
                            </Box>
                            <TextField
                                variant="outlined"
                                required
                                fullWidth
                                id="email"
                                name="email"
                                placeholder="nome@email.com"
                                value={user.email}
                                onChange={handleChangeInput}
                                autoComplete="email"
                                autoFocus={mdUp}
                                className={classes.field}
                            />

                            <Typography
                                variant="body2"
                                style={{
                                    fontWeight: 700,
                                    marginBottom: 6,
                                    color:
                                        theme.palette.type === "dark"
                                            ? "rgba(255,255,255,0.92)"
                                            : "rgba(15,23,42,0.88)",
                                }}
                            >
                                {i18n.t("login.form.password")}
                            </Typography>
                            <TextField
                                variant="outlined"
                                required
                                fullWidth
                                name="password"
                                type={showPassword ? "text" : "password"}
                                id="password"
                                value={user.password}
                                onChange={handleChangeInput}
                                autoComplete="current-password"
                                className={classes.field}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle password visibility"
                                                onClick={togglePasswordVisibility}
                                                edge="end"
                                                size="small"
                                            >
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={remember}
                                        onChange={(e) => setRemember(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label={i18n.t("login.buttons.rememberMe")}
                                className={classes.checkLabel}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                color="primary"
                                className={classes.submit}
                            >
                                {i18n.t("login.form.button")}
                            </Button>
                        </form>

                        <Box display="flex" alignItems="center" my={2}>
                            <Box
                                flex={1}
                                style={{ height: 1, backgroundColor: theme.palette.divider, opacity: 0.45 }}
                            />
                            <Typography className={classes.dividerText} style={{ paddingLeft: 16, paddingRight: 16 }}>
                                {i18n.t("login.buttons.orContinue")}
                            </Typography>
                            <Box
                                flex={1}
                                style={{ height: 1, backgroundColor: theme.palette.divider, opacity: 0.45 }}
                            />
                        </Box>

                        <Grid container spacing={1}>
                            <Grid item xs={6}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    className={classes.oauthBtn}
                                    startIcon={<FcGoogle size={20} />}
                                    onClick={onSocialClick}
                                >
                                    {i18n.t("login.buttons.socialGoogle")}
                                </Button>
                            </Grid>
                            <Grid item xs={6}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    className={classes.oauthBtn}
                                    startIcon={<FaFacebook />}
                                    style={{ color: "#1877f2" }}
                                    onClick={onSocialClick}
                                >
                                    {i18n.t("login.buttons.socialFacebook")}
                                </Button>
                            </Grid>
                        </Grid>

                        <Typography className={classes.footerNote}>
                            {helpHref ? (
                                <Link href={helpHref} target="_blank" rel="noopener noreferrer" className={classes.footerLink}>
                                    {i18n.t("login.buttons.help")}
                                </Link>
                            ) : (
                                <Typography component="span" style={{ color: theme.palette.text.secondary }}>
                                    {i18n.t("login.buttons.help")}
                                </Typography>
                            )}
                        </Typography>

                        <Typography className={classes.versionPill}>v{packageJson.version}</Typography>
                    </Box>
                </Box>
            </Box>
        </>
    );
};

export default Login;
