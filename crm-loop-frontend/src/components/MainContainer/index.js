import React from "react";
import clsx from "clsx";

import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";

const useStyles = makeStyles(theme => ({
	mainContainer: {
		flex: 1,
		padding: theme.spacing(2),
		height: `calc(100% - 48px)`,
		minWidth: 0,
	},

	contentWrapper: {
		height: "100%",
		minHeight: 0,
		overflowY: "hidden",
		display: "flex",
		flexDirection: "column",
		alignItems: "stretch",
	},

	contentWrapperCRM: {
		overflowY: "auto",
		overflowX: "hidden",
	},
}));

const MainContainer = ({ children, fullWidth = false, className, crm = false }) => {
	const classes = useStyles();

	const fullBleed = fullWidth || crm;

	return (
		<Container maxWidth={fullBleed ? false : "lg"} className={clsx(classes.mainContainer, className)}>
			<div
				className={clsx(classes.contentWrapper, crm && classes.contentWrapperCRM)}
				style={fullBleed ? { minWidth: 0 } : undefined}
			>
				{children}
			</div>
		</Container>
	);
};

export default MainContainer;
