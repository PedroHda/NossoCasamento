package io.github.pedrohda.nossocasamento;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlanningCalendarPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
