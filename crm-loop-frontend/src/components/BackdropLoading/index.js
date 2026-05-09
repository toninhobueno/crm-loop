import React from "react";

import Backdrop from "@material-ui/core/Backdrop";
import Box from "@material-ui/core/Box";
import CircularProgress from "@material-ui/core/CircularProgress";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
	backdropRoot: {
		zIndex: theme.zIndex.modal,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		padding: theme.spacing(2),
		backgroundColor:
			theme.palette.type === "light"
				? "rgba(248, 250, 252, 0.72)"
				: "rgba(15, 23, 42, 0.78)",
		backdropFilter: "blur(14px)",
		WebkitBackdropFilter: "blur(14px)",
		transition: "opacity 0.3s ease",
	},
	panel: {
		minWidth: 280,
		maxWidth: 360,
		width: "100%",
		padding: theme.spacing(3.5, 4),
		borderRadius: 22,
		textAlign: "center",
		backgroundColor:
			theme.palette.type === "light"
				? "rgba(255, 255, 255, 0.92)"
				: "rgba(30, 41, 59, 0.88)",
		border:
			theme.palette.type === "light"
				? "1px solid rgba(15, 23, 42, 0.08)"
				: "1px solid rgba(148, 163, 184, 0.15)",
		boxShadow:
			theme.palette.type === "light"
				? "0 24px 64px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255,255,255,0.95)"
				: "0 28px 80px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255,255,255,0.06)",
	},
	brandRow: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		gap: theme.spacing(1.25),
		marginBottom: theme.spacing(2.5),
	},
	dot: {
		width: 10,
		height: 10,
		borderRadius: "50%",
		background: `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
		boxShadow: `0 0 18px ${theme.palette.primary.main}66`,
	},
	title: {
		fontWeight: 600,
		fontSize: "0.95rem",
		letterSpacing: "-0.02em",
		color:
			theme.palette.type === "light"
				? theme.palette.text.primary
				: theme.palette.common.white,
	},
	progressWrap: {
		position: "relative",
		display: "inline-flex",
		marginBottom: theme.spacing(2),
	},
	progress: {
		color: theme.palette.primary.main,
	},
	glow: {
		position: "absolute",
		inset: -8,
		borderRadius: "50%",
		background: `radial-gradient(circle at 50% 40%, ${theme.palette.primary.main}22 0%, transparent 70%)`,
		pointerEvents: "none",
	},
	subtitle: {
		fontSize: "0.8125rem",
		fontWeight: 500,
		color: theme.palette.text.secondary,
		letterSpacing: "0.01em",
	},
	ellipsis: {
		display: "inline-block",
		marginLeft: 2,
		minWidth: "1em",
		animation: "$pulseDots 1.2s ease-in-out infinite",
	},
	"@keyframes pulseDots": {
		"0%, 100%": { opacity: 0.45 },
		"50%": { opacity: 1 },
	},
}));

const BackdropLoading = () => {
	const classes = useStyles();

	return (
		<Backdrop className={classes.backdropRoot} open>
			<Box className={classes.panel}>
				<div className={classes.brandRow}>
					<span className={classes.dot} aria-hidden />
					<Typography component="span" className={classes.title}>
						CRM Loop
					</Typography>
				</div>
				<div className={classes.progressWrap}>
					<span className={classes.glow} aria-hidden />
					<CircularProgress className={classes.progress} size={52} thickness={3.6} />
				</div>
				<Typography className={classes.subtitle} component="div">
					Carregando<span className={classes.ellipsis}>…</span>
				</Typography>
			</Box>
		</Backdrop>
	);
};

export default BackdropLoading;
