package cmd

import (
  "github.com/spf13/cobra"
  "github.com/spf13/viper"
  "github.com/bartlettc22/kubeviz-server/server"
)

var listenerPort int

func init() {
  startCmd.Flags().IntVarP(&listenerPort, "listener-port", "p", 80, "server listener port")
  viper.BindPFlag("listener_port", startCmd.Flags().Lookup("listener-port"))
  rootCmd.AddCommand(startCmd)
}

var startCmd = &cobra.Command{
  Use:   "start",
  Short: "Start server",
  Long:  `Starts the kubeviz server`,
  Run: func(cmd *cobra.Command, args []string) {
    server.Start(viper.GetInt("listener_port"))
  },
}
