# frozen_string_literal: true

MyPluginModule::Engine.routes.draw do
  get "/home" => "PolkassemblyAuth#index"
  # define routes here
end

Discourse::Application.routes.draw { mount ::PolkasseemblyAuth::Engine, at: "polkassembly-auth" }
